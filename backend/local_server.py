"""
Rhythm Local Verification Server — Nova 2 Lite via Bedrock Converse API

Runs on your Mac. The phone app sends video to this server, which calls
Amazon Nova 2 Lite to analyze whether the routine was actually completed.

Usage:
  # Load credentials from backend/.env automatically:
  python3 backend/local_server.py

  # Or pass credentials directly:
  AWS_ACCESS_KEY_ID=xxx AWS_SECRET_ACCESS_KEY=xxx python3 backend/local_server.py

The server runs on port 3001.

Encoding pipeline:
  Phone records at device-native frame rate (30-60 fps) and high resolution.
  This server ALWAYS re-encodes before shipping to Nova:
    - Downsample to 15 fps (Nova does not need 60 fps to see a routine)
    - Scale longest edge to 480 px
    - libx264 preset=ultrafast, CRF 30
    - Strip audio
    - Cap at 12 seconds
  That drops a ~5 MB phone clip to ~150-400 KB and cuts Bedrock input
  transfer + inference time noticeably.
"""

import json
import time
import hashlib
import base64
import os
import re
import subprocess
import sys
import tempfile
from http.server import HTTPServer, BaseHTTPRequestHandler

# Force unbuffered stdout — important when the server runs under a process
# manager that pipes stdout, otherwise logs only flush on exit.
try:
    sys.stdout.reconfigure(line_buffering=True)  # py3.7+
except Exception:
    pass

# Load .env file if it exists
env_path = os.path.join(os.path.dirname(os.path.abspath(__file__)), '.env')
if os.path.exists(env_path):
    with open(env_path) as f:
        for line in f:
            line = line.strip()
            if line and not line.startswith('#') and '=' in line:
                k, v = line.split('=', 1)
                os.environ.setdefault(k.strip(), v.strip())

import boto3

MODEL_ID = 'us.amazon.nova-2-lite-v1:0'
REGION = os.environ.get('AWS_DEFAULT_REGION', 'us-east-1')
# When running behind the x402 gateway, run this server on a different port.
# Default stays 3001 for backwards compatibility.
PORT = int(os.environ.get('RHYTHM_VERIFY_PORT', os.environ.get('PORT', '3001')))

# Encoding targets. Upload is what Nova gets, not what the user sees.
TARGET_FPS = 15
TARGET_LONG_EDGE = 480
TARGET_MAX_SECONDS = 30
TARGET_CRF = 30
TARGET_PRESET = 'ultrafast'

# Mirror all logs to this file so you can `tail -f backend/server.log` from
# any terminal even if the server was started by a background process manager.
LOG_FILE = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'server.log')
try:
    _log_fh = open(LOG_FILE, 'a', buffering=1, encoding='utf-8')
except Exception:
    _log_fh = None


def log(msg=''):
    """Print to stdout AND to backend/server.log, line-buffered."""
    print(msg, flush=True)
    if _log_fh is not None:
        try:
            # Strip ANSI color codes for the file version
            clean = re.sub(r'\x1b\[[0-9;]*m', '', str(msg))
            _log_fh.write(clean + '\n')
        except Exception:
            pass

# ANSI color helpers — kept tiny to avoid a dependency.
class C:
    RESET = '\033[0m'
    BOLD = '\033[1m'
    DIM = '\033[2m'
    GREEN = '\033[32m'
    RED = '\033[31m'
    YELLOW = '\033[33m'
    BLUE = '\033[34m'
    CYAN = '\033[36m'
    MAGENTA = '\033[35m'


def _supports_color():
    return os.environ.get('TERM') not in (None, 'dumb') and os.isatty(1)


COLOR = _supports_color()


def c(text, color):
    return f'{color}{text}{C.RESET}' if COLOR else text


bedrock = boto3.client('bedrock-runtime', region_name=REGION)

VERIFICATION_SCHEMA = {
    "type": "object",
    "properties": {
        "verified": {"type": "boolean"},
        "confidence": {"type": "number", "minimum": 0, "maximum": 1},
        "product_visible": {"type": "boolean"},
        "product_in_use": {"type": "boolean"},
        "routine_completed": {"type": "boolean"},
        "appears_genuine": {"type": "boolean"},
        "reason": {"type": "string"},
        "short_reason": {
            "type": "string",
            "description": (
                "A very brief 3-8 word phrase describing the single most important "
                "reason the routine could not be verified, written in lowercase. "
                "Examples: 'could not detect cup', 'no person visible', "
                "'pill not swallowed on camera', 'product label unreadable', "
                "'video too dark'. If verified=true, return 'routine verified'."
            )
        }
    },
    "required": ["verified", "confidence", "product_visible", "product_in_use",
                  "routine_completed", "appears_genuine", "reason", "short_reason"]
}


def probe_video(path):
    """Return metadata dict with width/height/fps/duration/codec, or {}."""
    try:
        result = subprocess.run(
            [
                'ffprobe', '-v', 'error', '-select_streams', 'v:0',
                '-show_entries',
                'stream=width,height,r_frame_rate,avg_frame_rate,codec_name,nb_frames,duration:'
                'format=duration,bit_rate,size',
                '-of', 'json', path,
            ],
            capture_output=True, timeout=5,
        )
        if result.returncode != 0:
            return {}
        data = json.loads(result.stdout or b'{}')
        streams = data.get('streams') or [{}]
        fmt = data.get('format') or {}
        s = streams[0]

        def parse_rate(r):
            if not r:
                return None
            if '/' in str(r):
                n, d = str(r).split('/', 1)
                try:
                    n, d = float(n), float(d)
                    return n / d if d else None
                except ValueError:
                    return None
            try:
                return float(r)
            except ValueError:
                return None

        return {
            'width': s.get('width'),
            'height': s.get('height'),
            'codec': s.get('codec_name'),
            'fps': parse_rate(s.get('avg_frame_rate') or s.get('r_frame_rate')),
            'duration_s': float(fmt.get('duration') or s.get('duration') or 0) or None,
            'bitrate_kbps': int(fmt.get('bit_rate') or 0) // 1000 if fmt.get('bit_rate') else None,
            'size_bytes': int(fmt.get('size') or 0) or None,
        }
    except Exception:
        return {}


def encode_for_nova(video_bytes):
    """Always re-encode to a Nova-friendly low-fps, small-dimension clip.

    Returns (encoded_bytes, stats_dict). On failure, returns (video_bytes, {'error': ...}).
    """
    with tempfile.NamedTemporaryFile(suffix='.mp4', delete=False) as inp:
        inp.write(video_bytes)
        input_path = inp.name

    output_path = input_path + '.encoded.mp4'
    stats = {
        'input_bytes': len(video_bytes),
        'input_meta': probe_video(input_path),
    }

    # scale so longest side = TARGET_LONG_EDGE, keep aspect, force even dimensions.
    # "if(gt(iw,ih), ...)" handles landscape vs portrait in one expression.
    scale = (
        f"scale=w='if(gt(iw,ih),{TARGET_LONG_EDGE},-2)'"
        f":h='if(gt(iw,ih),-2,{TARGET_LONG_EDGE})'"
    )
    fps_filter = f'fps={TARGET_FPS}'
    vf = f'{scale},{fps_filter}'

    cmd = [
        'ffmpeg', '-y',
        '-hide_banner', '-loglevel', 'error',
        '-i', input_path,
        '-t', str(TARGET_MAX_SECONDS),
        '-vf', vf,
        '-c:v', 'libx264',
        '-preset', TARGET_PRESET,
        '-crf', str(TARGET_CRF),
        '-an',
        '-pix_fmt', 'yuv420p',
        '-movflags', '+faststart',
        output_path,
    ]

    t0 = time.time()
    try:
        result = subprocess.run(cmd, capture_output=True, timeout=30)
        stats['encode_ms'] = int((time.time() - t0) * 1000)

        if result.returncode != 0:
            stats['error'] = (result.stderr or b'').decode(errors='replace')[-200:]
            return video_bytes, stats

        with open(output_path, 'rb') as f:
            encoded = f.read()

        stats['output_bytes'] = len(encoded)
        stats['output_meta'] = probe_video(output_path)
        stats['ratio'] = (
            stats['output_bytes'] / stats['input_bytes']
            if stats['input_bytes'] else None
        )
        return encoded, stats

    except Exception as e:
        stats['encode_ms'] = int((time.time() - t0) * 1000)
        stats['error'] = str(e)
        return video_bytes, stats
    finally:
        for p in (input_path, output_path):
            try:
                os.unlink(p)
            except OSError:
                pass


def _format_meta(meta):
    if not meta:
        return '(no metadata)'
    parts = []
    w, h = meta.get('width'), meta.get('height')
    if w and h:
        parts.append(f'{w}x{h}')
    fps = meta.get('fps')
    if fps:
        parts.append(f'{fps:.1f}fps')
    dur = meta.get('duration_s')
    if dur:
        parts.append(f'{dur:.1f}s')
    codec = meta.get('codec')
    if codec:
        parts.append(codec)
    br = meta.get('bitrate_kbps')
    if br:
        parts.append(f'{br}kbps')
    return ' · '.join(parts) or '(no metadata)'


def verify_with_nova(routine_id, sponsor, video_bytes, location, emit):
    """Call Amazon Nova 2 Lite via Bedrock Converse API for video verification.

    Returns (judgment_dict, raw_response_dict, timing_dict).
    """
    content = []
    timing = {}

    if video_bytes:
        t_enc = time.time()
        encoded, enc_stats = encode_for_nova(video_bytes)
        timing['encode_ms'] = int((time.time() - t_enc) * 1000)

        # Pretty-print compression results.
        in_mb = enc_stats['input_bytes'] / 1024 / 1024
        emit(c(f'  Encode: input  {_format_meta(enc_stats.get("input_meta"))} '
              f'({in_mb:.2f} MB)', C.DIM))
        if 'output_bytes' in enc_stats:
            out_kb = enc_stats['output_bytes'] / 1024
            ratio = enc_stats.get('ratio') or 0
            emit(c(f'  Encode: output {_format_meta(enc_stats.get("output_meta"))} '
                  f'({out_kb:.1f} KB, {ratio*100:.1f}% of input) in '
                  f'{enc_stats.get("encode_ms", 0)}ms', C.GREEN))
        else:
            emit(c(f'  Encode failed: {enc_stats.get("error", "unknown")[:180]}', C.YELLOW))

        content.append({
            'video': {
                'format': 'mp4',
                'source': {'bytes': encoded},
            },
        })

    sponsor_check = ''
    is_sponsored = bool(sponsor and sponsor.lower() not in ('none', 'unknown', 'rhythm', ''))
    if is_sponsored:
        sponsor_check = (
            f'1. Is the {sponsor} product clearly visible with its label readable?\n'
            f'2. Is the product being actively used on camera — opened, squeezed, poured, '
            f'consumed, or applied — not just sitting on a surface?\n'
        )
    else:
        sponsor_check = (
            f'1. (No sponsor product required — skip product checks, set product_visible and product_in_use to true)\n'
            f'2. (No sponsor product required)\n'
        )

    prompt_text = (
        f'You are a verification agent for a daily routine app called Rhythm. '
        f'You are given a short video clip of a person performing a daily routine. '
        f'Examine the video carefully. Do not make up information not present in the video.\n\n'
        f'ROUTINE: {routine_id}\n'
        f'EXPECTED SPONSOR PRODUCT: {sponsor if is_sponsored else "none (unsponsored routine)"}\n'
        f'LOCATION: {location or "not provided"}\n\n'
        f'Determine the following from the video:\n'
        f'{sponsor_check}'
        f'3. Is the routine ({routine_id}) performed from start to finish?\n'
        f'4. Does this appear to be a genuine, real-time capture — not a replay of '
        f'a screen, a photo of a photo, or a pre-recorded clip?\n\n'
        f'For the "short_reason" field, write a 3-8 word lowercase phrase that '
        f'names the single most important reason the routine could not be verified '
        f'from this specific video (what was missing, unclear, or wrong). '
        f'Be concrete and observation-based — name the object, action, or person '
        f'that was missing or unclear. '
        f'Good examples: "could not detect cup", "no drinking motion seen", '
        f'"pill not swallowed on camera", "toothbrush not visible", '
        f'"no person in frame", "video too dark to see action", '
        f'"product label not readable", "routine cut off before finishing". '
        f'If the routine IS verified, set short_reason to "routine verified".\n\n'
        f'Return ONLY valid JSON matching this schema (no markdown, no explanation):\n'
        f'{json.dumps(VERIFICATION_SCHEMA, indent=2)}'
    )
    content.append({'text': prompt_text})

    # Call Nova with retry on transient errors
    response = None
    last_error = None
    output_text = ''
    for attempt in range(2):
        try:
            t_call = time.time()
            response = bedrock.converse(
                modelId=MODEL_ID,
                messages=[{'role': 'user', 'content': content}],
                inferenceConfig={'maxTokens': 500, 'temperature': 0},
            )
            timing['bedrock_ms'] = int((time.time() - t_call) * 1000)
            output_text = response['output']['message']['content'][0]['text']
            break
        except Exception as e:
            last_error = e
            if attempt == 0 and 'Malformed' in str(e):
                emit(c(f'  Retry: malformed input, dropping video and retrying text-only', C.YELLOW))
                content = [c_ for c_ in content if 'video' not in c_]
                content.insert(
                    0,
                    {
                        'text': (
                            '[Video could not be processed. Analyze based on the routine '
                            'description only. Set verified to false and short_reason to '
                            '"video could not be processed".]'
                        )
                    },
                )
                continue
            raise
    else:
        raise last_error

    # Parse JSON from response
    judgment = None
    try:
        judgment = json.loads(output_text)
    except json.JSONDecodeError:
        m = re.search(r'\{.*\}', output_text, re.DOTALL)
        if m:
            try:
                judgment = json.loads(m.group())
            except json.JSONDecodeError:
                pass

    if judgment is None:
        judgment = {
            'verified': False, 'confidence': 0.0,
            'product_visible': False, 'product_in_use': False,
            'routine_completed': False, 'appears_genuine': False,
            'reason': f'Could not parse model response: {output_text[:200]}',
            'short_reason': 'verification failed',
        }

    return judgment, response, timing


class VerifyHandler(BaseHTTPRequestHandler):
    def do_OPTIONS(self):
        self.send_response(200)
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Access-Control-Allow-Methods', 'POST, OPTIONS')
        self.send_header('Access-Control-Allow-Headers', 'Content-Type')
        self.end_headers()

    def _log(self, msg):
        log(msg)

    def do_POST(self):
        if self.path != '/verify':
            self.send_json(404, {'error': 'Not found'})
            return

        start = time.time()
        request_id = hashlib.sha1(f'{start}{id(self)}'.encode()).hexdigest()[:8]

        # Section break so multi-request logs are easy to read
        self._log('')
        self._log(c('━' * 78, C.DIM))
        self._log(c(f'▶ {time.strftime("%H:%M:%S")} POST /verify  id={request_id}', C.BOLD + C.CYAN))

        try:
            length = int(self.headers.get('Content-Length', 0))
            t_read = time.time()
            raw_body = self.rfile.read(length) if length > 0 else b''
            body = json.loads(raw_body) if raw_body else {}
            read_ms = int((time.time() - t_read) * 1000)

            routine_id = body.get('routine_id', 'unknown')
            sponsor = body.get('sponsor', 'unknown')
            wallet = body.get('wallet')
            location = body.get('location')
            timestamp = body.get('timestamp', int(time.time() * 1000))
            video_b64 = body.get('video_b64')

            if not routine_id or not sponsor:
                self._log(c(f'  ✗ 400 Missing routine_id or sponsor', C.RED))
                self.send_json(400, {'error': 'Missing routine_id or sponsor'})
                return

            bundle_hash = hashlib.sha256(
                f'{routine_id}:{sponsor}:{wallet}:{timestamp}'.encode()
            ).hexdigest()[:16]

            video_bytes = base64.b64decode(video_b64) if video_b64 else b''
            video_size_mb = len(video_bytes) / 1024 / 1024 if video_bytes else 0
            b64_size_mb = len(video_b64 or '') / 1024 / 1024

            # Request summary
            self._log(f'  {c("routine:", C.DIM)} {routine_id}')
            self._log(f'  {c("sponsor:", C.DIM)} {sponsor}{"" if sponsor and sponsor.lower() not in ("none", "unknown", "rhythm", "") else c(" (unsponsored)", C.DIM)}')
            if wallet:
                self._log(f'  {c("wallet: ", C.DIM)} {wallet[:10]}...{wallet[-6:] if len(wallet) > 16 else ""}')
            self._log(f'  {c("location:", C.DIM)} {location or c("(none)", C.DIM)}')
            self._log(f'  {c("payload:", C.DIM)} {b64_size_mb:.2f} MB base64, read in {read_ms}ms')
            if video_bytes:
                self._log(f'  {c("video:  ", C.DIM)} {video_size_mb:.2f} MB decoded ({len(video_bytes):,} bytes)')
            else:
                self._log(c('  video:   (none — no video_b64 in payload)', C.YELLOW))

            self._log(c(f'  Calling Nova 2 Lite ({MODEL_ID})...', C.BLUE))
            judgment, raw_response, timing = verify_with_nova(
                routine_id, sponsor, video_bytes, location, self._log,
            )

            # Policy check
            issues = []
            is_sponsored = bool(sponsor and sponsor.lower() not in ('none', 'unknown', 'rhythm', ''))

            if judgment.get('confidence', 0) < 0.70:
                issues.append(f"Confidence {judgment.get('confidence', 0):.2f} below 0.70")
            if is_sponsored and not judgment.get('product_visible'):
                issues.append('Sponsor product not visible')
            if is_sponsored and not judgment.get('product_in_use'):
                issues.append('Product not actively used')
            if not judgment.get('routine_completed'):
                issues.append('Routine not completed')
            if not judgment.get('appears_genuine'):
                issues.append('Capture does not appear genuine')

            med_routines = ['take-statin', 'take-metformin', 'take-bp-med',
                            'use-inhaler', 'glucose-check', 'apply-topical']
            if routine_id in med_routines and not location:
                issues.append('Medication routines require location')

            policy_passed = len(issues) == 0 and judgment.get('verified', False)
            payment_id = f'x402_{bundle_hash}_{int(time.time())}' if policy_passed else None

            # Derive user-facing short_reason
            if policy_passed:
                short_reason = 'routine verified'
            else:
                short_reason = (judgment.get('short_reason') or '').strip().lower()
                if not short_reason or short_reason == 'routine verified':
                    if issues:
                        first = issues[0].lower()
                        if 'confidence' in first:
                            short_reason = 'not confident enough'
                        elif 'product not visible' in first or 'sponsor product not visible' in first:
                            short_reason = 'sponsor product not visible'
                        elif 'product not actively used' in first:
                            short_reason = 'product not actively used'
                        elif 'routine not completed' in first:
                            short_reason = 'routine not completed on camera'
                        elif 'genuine' in first:
                            short_reason = 'capture not genuine'
                        elif 'location' in first:
                            short_reason = 'location required for medication'
                        else:
                            short_reason = first[:60]
                    else:
                        short_reason = 'could not verify routine'

            elapsed = int((time.time() - start) * 1000)

            # ── Detailed analytics ────────────────────────────────────────
            usage = (raw_response or {}).get('usage') or {}
            metrics = (raw_response or {}).get('metrics') or {}
            stop_reason = (raw_response or {}).get('stopReason', 'n/a')

            self._log('')
            self._log(c('  ── Nova raw response ──', C.MAGENTA + C.BOLD))
            self._log(c(f'  stopReason:  {stop_reason}', C.DIM))
            if usage:
                self._log(
                    c(
                        f'  tokens:      in={usage.get("inputTokens", "?")}  '
                        f'out={usage.get("outputTokens", "?")}  '
                        f'total={usage.get("totalTokens", "?")}',
                        C.DIM,
                    )
                )
            if metrics.get('latencyMs') is not None:
                self._log(c(f'  bedrock latencyMs: {metrics["latencyMs"]}', C.DIM))
            # The full judgment from Nova, pretty-printed:
            self._log(c('  judgment (parsed from Nova output):', C.MAGENTA))
            for line in json.dumps(judgment, indent=2).splitlines():
                self._log(c('    ' + line, C.DIM))

            self._log('')
            self._log(c('  ── Policy ──', C.MAGENTA + C.BOLD))
            self._log(
                f'  sponsored:   {is_sponsored}   confidence: {judgment.get("confidence", 0):.2f}   '
                f'verified(model): {judgment.get("verified")}'
            )
            if issues:
                for issue in issues:
                    self._log(c(f'  × {issue}', C.YELLOW))
            else:
                self._log(c('  ✓ all policy checks passed', C.GREEN))

            self._log('')
            self._log(c('  ── Timing breakdown ──', C.MAGENTA + C.BOLD))
            self._log(f'  encode:       {timing.get("encode_ms", 0):>6} ms')
            self._log(f'  bedrock:      {timing.get("bedrock_ms", 0):>6} ms')
            self._log(f'  read+parse:   {read_ms:>6} ms')
            other = elapsed - sum(v for v in (timing.get('encode_ms'), timing.get('bedrock_ms'), read_ms) if v)
            self._log(f'  other:        {other:>6} ms')
            self._log(c(f'  total:        {elapsed:>6} ms', C.BOLD))

            # Final decision line
            self._log('')
            if policy_passed:
                self._log(
                    c(f'  ✓ VERIFIED — {short_reason} '
                      f'(confidence {judgment.get("confidence", 0):.2f})', C.GREEN + C.BOLD)
                )
                if payment_id:
                    self._log(c(f'  x402 payment_id: {payment_id}', C.GREEN))
            else:
                self._log(
                    c(f'  ✗ NOT VERIFIED — {short_reason} '
                      f'(confidence {judgment.get("confidence", 0):.2f})', C.RED + C.BOLD)
                )
                if judgment.get('reason'):
                    self._log(c(f'  model reason: {judgment["reason"][:200]}', C.DIM))

            self.send_json(200, {
                'verified': policy_passed,
                'confidence': judgment.get('confidence', 0.0),
                'reason': judgment.get('reason', ''),
                'short_reason': short_reason,
                'product_visible': judgment.get('product_visible', False),
                'product_in_use': judgment.get('product_in_use', False),
                'routine_completed': judgment.get('routine_completed', False),
                'appears_genuine': judgment.get('appears_genuine', False),
                'model': MODEL_ID,
                'processing_time_ms': elapsed,
                'policy_passed': policy_passed,
                'policy_issues': issues,
                'x402_payment_id': payment_id,
                'bundle_hash': bundle_hash,
                'agents': ['capture', 'verification', 'policy', 'payout'],
            })

        except Exception as e:
            import traceback
            self._log(c(f'  ✗ ERROR: {e}', C.RED + C.BOLD))
            for line in traceback.format_exc().splitlines()[-5:]:
                self._log(c(f'    {line}', C.DIM))
            self.send_json(500, {'error': str(e), 'verified': False})

    def send_json(self, status, body):
        self.send_response(status)
        self.send_header('Content-Type', 'application/json')
        self.send_header('Access-Control-Allow-Origin', '*')
        self.end_headers()
        self.wfile.write(json.dumps(body).encode())

    def log_message(self, format, *args):
        # Suppress the default HTTP request line; we log our own section header.
        return


if __name__ == '__main__':
    # Preflight — check ffmpeg is available; we need it for the re-encode pass.
    try:
        ffv = subprocess.run(['ffmpeg', '-version'], capture_output=True, timeout=3)
        ffmpeg_line = (ffv.stdout or b'').decode(errors='replace').splitlines()[0] if ffv.returncode == 0 else 'not found'
    except Exception as e:
        ffmpeg_line = f'missing ({e})'

    log()
    log(c(f'{C.BOLD}Rhythm Verification Server', C.BOLD))
    log(f'  Model:    {MODEL_ID}')
    log(f'  Region:   {REGION}')
    log(f'  Port:     {PORT}')
    log(f'  Encode:   {TARGET_FPS}fps @ {TARGET_LONG_EDGE}px long-edge, preset={TARGET_PRESET}, crf={TARGET_CRF}, max {TARGET_MAX_SECONDS}s')
    log(f'  ffmpeg:   {ffmpeg_line}')
    log(f'  Log file: {LOG_FILE}')
    log()

    # Quick test that credentials work
    try:
        test = bedrock.converse(
            modelId=MODEL_ID,
            messages=[{'role': 'user', 'content': [{'text': 'Hi'}]}],
            inferenceConfig={'maxTokens': 5, 'temperature': 0},
        )
        log(c('  Nova 2 Lite: connected', C.GREEN))
    except Exception as e:
        log(c(f'  WARNING: Nova 2 Lite test failed: {e}', C.YELLOW))

    log()
    log(c(f'  Listening on http://0.0.0.0:{PORT}/verify', C.BOLD))
    log(c(f'  Tail logs with: tail -f {LOG_FILE}', C.DIM))
    log()

    server = HTTPServer(('0.0.0.0', PORT), VerifyHandler)
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        log('\nShutting down...')
        server.server_close()
