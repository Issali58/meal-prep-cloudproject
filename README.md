# Meal prep project: NUTRIGAINS

NUTRIGAINS is a serverless meal prep application that allows users to register, place meal orders, and receive notifications. It leverages cloud-native services to handle user management, authentication, and order processing.

## Project overview

This project implements a serverless architecture using AWS. This implementation is abstracted with a frontend for users to interact with the services. This allows users to do the following.
• Create user accounts for authentication with the API.
• Create meal orders with different options
• Email notifications for every order placed

## Architecture

For the frontend, the web app was created using the following.

- HTML, CSS, JAVASCRIPT: The website for user interaction to login, logout and make orders.

On the backend, the following AWS services were used for the application.

- **Amazon Cognito**: handle user management and authentication
- **Amazon API Gateway**: HTTP API endpoints to handle user requests and responses.
- **AWS Lambda**: supports serverless functions to handle user requests.
- **AWS DynamoDB**: an NOSQL database to store user meal orders.
- **Amazon SES**: a service to handle the user notifications for orders made.
- **AWS CloudFormation**: to handle Infrastructure as code during deployment CI/CD.

## Architectural diagram
!(BACKEND/archdia1.png)

Below is a brief overview of the architectural diagram.

1. The frontend uses HTML, CSS, Javascript to provide the UI component for authenticate users to sign in in the web application.

2. The users are directed to the Cognito hosted UI to sign in with their credentials for authentication.

3. After successful authentication, Cognito provides a JWT to give identity and access for a user to give requests to the backend.

4. As the JSON web Token is stored in the frontend, the user makes an order request (call) to the API gateway with the request containing the access token from the JWT claims.

5. Api gateway then validates the access token provided in the request with Cognito and the Api gateway authorizer.

6. After successful validation, the request with the token is sent to the backend AWS Lambda function responsible for creating the order placed. The function extracts details from the JWT token claims.

7. The create order function extracts the necessary information from the user claims from the access token, creates addition information, and bundles all that information with the payload information from the request and writes the order to DynamoDB.

8. When the Lambda function writes to the database, the lambda function will send a response to the API which is then sent to user as a popup message of a successful order on the frontend.

9. In DynamoDB, DynamoDB streams are enabled to detect any added information added to the table. This then triggers the email notification lambda function.

10. The email notification lambda function is triggered and then it extracts the necessary information like the order id to be placed in the email template.

11. Amazon SES is then used with the email template formats from the order notification function to send order notification emails to the registered user emails.

Cloudwatch logs groups for the API gateway to log all requests and response for the API Gateway. The create order lambda function also has a log group created to log all invocations made and executions conducted by the lambda function when it is run.

## API Endpoints

- POST /ordersTable. This creates a new meal order.
- GET /ordersTable/{orderId}. This enables the retrieval of orders from the database.
- PUT /ordersTable/{orderId}. To update an existing order in the database.
- DELETE /ordersTable/{orderId}. To delete an order from the database.

## Authentication

The web app uses Amazon Cognito for user registration and login.

- Email based user registration and login using the Cognito hosted UI
- JWT based token for API authorization provided by Cognito.
- Password policies with minimum requirements

## Frontend integration

The frontend is integrated using the following:

1. After the automatic deployment of the stack using GitHub Actions, obtain the outputs.
   o API endpoint for the meal order creation.
   o Cognito user pool ID (id for the AWS Cognito resource of service)
   o Cognito user client ID (identifier of app client in the user pool)
   
2. Configure your frontend app to the following values

```config.js
const config = {
  COGNITO_DOMAIN: “userpooldomain.auth.{region}.amazoncognito.com",
  COGNITO_CLIENT_ID: "{UserPoolClientId}",
  LOGOUT_URI: "http://localhost:3000/index3.html",
  REDIRECT_URI: "http://localhost:3000/dashboard.html",
  API_ENDPOINT:
    “https://{api-id}.execute-api.{region}.amazonaws.com/dev'
/dev/OrdersTable",
  redirect_uri: "http://localhost:3000/index3.html"
};
```

3. The Amazon Cognito authentication flow in the frontend

   o User registration
   o Email verification
   o User login
   o JWT acquisition
   o The JWT is included in the API request

## Deployment

### Prerequisites

- GitHub repository for the CI/CD workflow for deployment
- Verified emails using Amazon SES.
  Note: If your account has Amazon SES in sandbox mode, you must add any email address to the SES list of identities manually and verify it. This project was done with SES sandbox hence you can request production access by filling out a request form, then you can send emails to any address without manual verification.
- An AWS account with permissions to create IAM roles to use OIDC (OpenID connect).

### Manual Deployment

1. Clone this repository:

   ```
   git clone https://github.com/Issali58/meal-prep-cloudproject.git
   cd meal-prep-cloudproject
   ```

2. Deploy the CloudFormation stack:

   ```
   aws cloudformation deploy \
     --template-file CognitoMpCfn.yml \
     --stack-name meal-prep-stack \
     --parameter-overrides \
       EnvironmentName=dev \
       DynamodbtableName=MealPrepOrderTable2 \
       EmailDomainID=yourdomain.com \
       SenderEmailParameter=verified-email@yourdomain.com \
     --capabilities CAPABILITY_NAMED_IAM
   ```

3. Get the deployment outputs:
   ```
   aws cloudformation describe-stacks \
     --stack-name meal-prep-stack \
     --query "Stacks[0].Outputs"
   ```

### Deployment with GitHub Actions and OIDC

This project uses secure deployment using GitHub actions and OpenID Connect (OIDC) for AWS authentication without the use of long-term AWS access keys.

#### Setting up OIDC authentication

To set up the OIDC authentication, deploy the OIDC_stack in your account manually using cloudformation. You cannot add the OIDC stack creation in a workflow file because it will cause a circular dependency hence you will have issues destroying the infrastructure using a workflow file.

1. Create a stack to create an IAM OIDC Identity provider for GitHub
   ```
   GitHubOIDCProvider:
   Type: AWS::IAM::OIDCProvider
   Properties:
   Url: https://token.actions.githubusercontent.com
   ClientIdList: - sts.amazonaws.com
   ```

2.	Create an IAM role within the stack for GitHub actions. Configure the IAM role to limit access to your repository:

```

GitHubActionsRole:
Type: AWS::IAM::Role
Properties:
AssumeRolePolicyDocument:
Version: "2012-10-17"
Statement: - Effect: Allow
Principal:
Federated: !Sub "arn:aws:iam::${AWS::AccountId}:oidc- provider/token.actions.githubusercontent.com"
Action: sts:AssumeRoleWithWebIdentity
Condition:
StringLike:
"token.actions.githubusercontent.com:sub": "repo:yourrepo/path:\*"

```

3.	Obtain the IAM role Arn to use it in the workflow file to deploy the infrastructure.

#### GitHub Actions workflow file

Create a .github/workflows/main.yml in your repo to deploy the infrastructure.

```

name: Deploy Meal-Prep stack
on:
push:
branches: [master]
pull_request:
branches: [master]
env:
AWS_REGION: us-east-1 # the region to which you are deploying.
STACK_NAME: CognitoMpCfn # stack name.
SENDER_EMAIL: ${{ secrets.SENDER_EMAIL }} # Store sender email in GitHub secrets
jobs:
  validate:
    runs-on: ubuntu-latest
    steps:
      - name: Checkout code
        uses: actions/checkout@v3
      - name: Set up Python
        uses: actions/setup-python@v4
        with:
          python-version: "3.13"
      - name: Install cfn-lint
        run: |
          pip install cfn-lint
      - name: Install cfn-nag
        run: |
          sudo gem install cfn-nag
      - name: Run cfn-lint
        run: |
          cfn-lint "./BACKEND/Cognito_MpCfn.yml"
      - name: Run cfn-nag
        run: |
          cfn_nag_scan --input-path BACKEND/Cognito_MpCfn.yml
  deploy:
    needs: validate
    runs-on: ubuntu-latest
    permissions:
      id-token: write
      contents: read
    steps:
      - name: Checkout code
        uses: actions/checkout@v3
      # First deployment: Use AWS OIDC role to set up the application stack
      - name: Configure AWS credentials
        uses: aws-actions/configure-aws-credentials@v4
        with:
          role-to-assume: ${{ secrets.GITHUBACTIONSROLEARN }}
          aws-region: ${{ env.AWS_REGION }}
      - name: Create SSM Parameter
        run: |
          aws ssm put-parameter \
            --name "/mealprep/sender-email" \
            --value "${{ secrets.SENDER_EMAIL }}" \
 --type "String" \
 --overwrite

      - name: AWS CloudFormation Validate
        run: |
          aws cloudformation validate-template \
            --template-body "file://./BACKEND/Cognito_MpCfn.yml"
      - name: Deploy CloudFormation Stack
        uses: aws-actions/aws-cloudformation-github-deploy@v1
        with:
          name: ${{ env.STACK_NAME }}
          template: "./BACKEND/Cognito_MpCfn.yml"
          parameter-overrides: >-
            EnvironmentName=dev,
            DynamodbtableName=YOURTABLENAME,
            EmailDomainID=gmail.com
          capabilities: CAPABILITY_NAMED_IAM
          no-fail-on-empty-changeset: "1"

```


#### GitHub Secrets

These are the secrets to be used in the workflow file and stored in your repository.
-	SENDER_EMAIL: verified email address in SES responsible for sending email notificaations to different users.
-	GITHUBACTIONSROLEARN: this from the ARN created from the oidc stack.
### Order Data Structure
```Json
{
  "userId": "cognito-user-id",
  "orderId": "uuid",
  "timestamp": "ISO-date-string",
  "customerName": "User's Name",
  "email": "user@example.com",
  "planType": "basic",
  "orderItems": [
    {
      "mealName": "Grilled Chicken with Quinoa",
      "quantity": 1
    }
  ],
  "startDate": "2023-12-01",
  "totalWeeks": 2
}
````

## Email Notification

Notifications are sent to users when an order is placed.
An email template resource is defined in CloudFormation, and you can customize to what the users will receive.

## Development

### Local development of the frontend

Install the Node.js server to your PC to enable local development

1. Download from the official website:

```
https://nodejs.org/
```

2. verify installation

```
node --version
npm –version
```

3. Install the http server globally

```
npm install http-server -g
```

4. Navigate to the project directory

```
cd /path/to/the/project
```

5. Start the server

```
http-server -p 3000 --cors -c-1
```

Or

```
http-server -p 3000 –cors
```

where:
-p 3000: Sets the port to 3000
--cors: Enables CORS (Cross-Origin Resource Sharing)
-c-1: Disables caching (sets Cache-Control to -1)
Access the web app through a web browser by navigating to:
http://localhost:3000 or http://<your-ip>:3000

### Feature addition

1. Create a new table in dynamoDB to store all the meals provided on the web app.
2. Update the frontend to have “Orders” section for a user to view all previous orders.
3. Adding new lambda functions to add on the business logic like deleting orders.
4. Combining Cognito user and identity pools (use of goggle, apple id) to enable scaling of the web apps to have more users.

## Logging and monitoring

Log groups are created to help when you are troubleshooting issues like the lambda function not executing. An API gateway log group is created to log all request that are handled by the API gateway.

```
ApiGatewayLogGroup:
    Type: AWS::Logs::LogGroup
    Properties:
      LogGroupName: !Join ["-", [!Ref EnvironmentName, "api-gateway-logs12"]]
      RetentionInDays: 7
  LambdaLogGroup:
    Type: AWS::Logs::LogGroup
    Properties:
      LogGroupName: !Join ["-", [!Ref EnvironmentName, "lambda-logs12"]]
      RetentionInDays: 7
```

## Security considerations

- Use of OIDC for secure deployment instead of AWS access keys in GitHub actions CI/CD.
- User passwords managed by Amazon Cognito use secure policies.
- Api endpoints and requests are secured by use of the JWT authentication token from Cognito for only signed in users.
- Use of lamba execution role with policies to use principle of least privilege access AWS resources.

## Cost considerations

This architecture uses different AWS services that may incur costs.
Since this a development environment with low traffic i.e. less than 1000 users, <100,000 API calls per month, this stack should on a larger extent be in the AWS free tier. For production environment, the costs estimate from 20 to 100 USD per month depending on the traffic.

- **Amazon Cognito**: Free tier includes 50,000 monthly active users. Pricing is per monthly active user when users grow past 50,000 monthly users.
- **Amazon API Gateway**:
  - First 1 million API calls per month are included in the free tier.
  - $3.50 per million API calls thereafter
  - Data transfer costs apply for outbound traffic.
- **AWS Lambda**:
  - Free tier includes 1 million requests per month and 400,000 GB seconds of compute time.
  - $0.20 per 1 million requests beyond the first million requests
- **Amazon DynamoDB**:
  - Free tier includes 25 GB of storage and 25 WCUs/RCUs
  - On-demand pricing or provisioned capacity (5 RCU/WCU in this template)
- **Amazon SES**:
  - $0.10 per 1000 emails sent. In sandbox mode you are limited to 200 emails sent per 24 hours.
- **CloudWatch logs**:
  - 5 GB of logs ingested, and 5 GB of logs stored of free per month.
  - $0.5 per GB for ingestion and $0.03 per GB beyond free tier limit.
  - The logs retention is set to 7 days in this architecture to reduce storage costs.

## Contact

Project maintained by Isaac.
GitHub: https://github.com/Issali58
