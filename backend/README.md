# Rhythm Backend — AWS Deployment

## Architecture

```
Mobile App (Solana Seeker)
    ↓ POST /verify
    { routine_id, sponsor, wallet, location, timestamp, video_b64 }
API Gateway (HTTP API)
    ↓
Lambda (Python 3.12, arm64, 512MB, 30s timeout)
    ↓ store video
S3 (rhythm-captures bucket)
    ↓ s3Location URI
Amazon Bedrock — Nova 2 Lite (amazon.nova-2-lite-v1:0)
    Watches the video, reasons about verification
    ↓
Policy check + x402 payment trigger
    ↓
Response to app
```

## Cost per verification

| Service | Cost |
|---------|------|
| Lambda (30s, 512MB) | ~$0.000003 |
| S3 PUT + GET | ~$0.000005 |
| Nova 2 Lite video (30s ≈ 50K tokens) | ~$0.003 |
| API Gateway | ~$0.000001 |
| **Total** | **~$0.003 per call** |

Sponsor pays ~$0.003 per verification via x402. At $2.50 reward per routine, the verification cost is 0.12% of the reward — negligible.

## Deploy

### 1. Create S3 bucket

```bash
aws s3 mb s3://rhythm-captures --region us-east-1
```

### 2. Create Lambda IAM role

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": ["bedrock:InvokeModel", "bedrock:Converse"],
      "Resource": "arn:aws:bedrock:us-east-1::foundation-model/amazon.nova-2-lite-v1:0"
    },
    {
      "Effect": "Allow",
      "Action": ["s3:PutObject", "s3:GetObject"],
      "Resource": "arn:aws:s3:::rhythm-captures/*"
    }
  ]
}
```

### 3. Deploy Lambda

```bash
cd backend/lambda
pip install boto3 -t .
zip -r verify.zip .

aws lambda create-function \
  --function-name rhythm-verify \
  --runtime python3.12 \
  --architectures arm64 \
  --handler verify.handler \
  --role arn:aws:iam::YOUR_ACCOUNT:role/rhythm-lambda-role \
  --zip-file fileb://verify.zip \
  --timeout 60 \
  --memory-size 512 \
  --environment Variables="{VIDEO_BUCKET=rhythm-captures,AWS_REGION=us-east-1}"
```

### 4. Create API Gateway

```bash
# Create HTTP API
aws apigatewayv2 create-api \
  --name rhythm-api \
  --protocol-type HTTP \
  --cors-configuration AllowOrigins='*',AllowMethods='POST,OPTIONS',AllowHeaders='Content-Type'

# Add POST /verify → Lambda
# Get the invoke URL from the console or CLI
```

### 5. Update the app

Set your API Gateway URL in `src/services/verification.ts`:

```typescript
const API_ENDPOINT = 'https://YOUR_API_ID.execute-api.us-east-1.amazonaws.com/verify';
```

Nova 2 Lite is automatically enabled on first invocation — no manual model access step needed.

## Notes

- Lambda timeout: 60s (video upload + Bedrock inference can take 10-20s)
- Memory: 512MB (base64 decode of 30s video ~15MB)
- Video stored in S3 for audit trail — add lifecycle policy to expire after 90 days
- Use `global.amazon.nova-2-lite-v1:0` for cross-region inference if us-east-1 is throttled

## Local x402 Gateway (paid `POST /verify`)

If you want to gate the local verifier behind x402, run **two processes**:

- **Upstream verifier** (your existing Bedrock/Nova server) on port **3002**
- **x402 gateway** (paid endpoint) on port **3001**

### 1) Install gateway deps (Node)

```bash
cd backend
cd x402-gateway
npm install
```

### 2) Start the upstream verifier (unpaid, internal)

```bash
RHYTHM_VERIFY_PORT=3002 python3 local_server.py
```

### 3) Start the paid gateway (x402)

Set your receiving EVM address (and optional price):

```bash
export X402_PAY_TO_EVM=0xYourEvmAddress
export X402_PRICE=$0.001
npm start
```

The app should continue calling `http://<LAN_IP>:3001/verify` as before, but now it will receive an `HTTP 402` challenge until it supplies `PAYMENT-SIGNATURE`.
