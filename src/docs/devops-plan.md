# DevOps & Deployment Plan

This document outlines the strategy for managing environments, secrets, security, and deployments for the OADRO Radio application.

## 1. Environment Strategy

To ensure stability and safety, we use separate Firebase projects for each environment. This guarantees complete data isolation. The deployment workflow is managed by GitHub Actions, which deploys to the appropriate environment based on the Git branch or tag.

| Environment | Firebase Project Suffix | Purpose                                        | Deployed From     | `apphosting.yaml` File Used  |
| ----------- | ----------------------- | ---------------------------------------------- | ----------------- | ---------------------------- |
| **Local**   | `(local)`               | Day-to-day development.                        | N/A               | N/A                          |
| **Staging** | `-staging`              | A live mirror of production for final testing. | `main` branch     | `apphosting.staging.yaml`    |
| **Prod**    | `-prod`                 | The public-facing application for users.       | Git tag / release | `apphosting.production.yaml` |

**Example Project Names:**

- `oadro-radio-staging`
- `oadro-radio-prod`

## 2. Configuration & Secrets Management

This project uses a combination of environment variables and a multi-file YAML strategy for configuration.

### Local Development

For local development, create a `.env.local` file by copying `.env.example`. This file contains all credentials for your local Firebase project and is ignored by Git.

### Deployed Environments (Staging & Production)

#### The `apphosting.yaml` File Structure

- **`apphosting.yaml`**: This is the **base** configuration file. It contains settings that are common across _all_ deployed environments (e.g., Discord Guild ID, default stream URLs).
- **`apphosting.<ENV>.yaml`**: These are **override** files. They contain settings specific to one environment. For example, `apphosting.staging.yaml` might set lower `minInstances` or define a `NEXT_PUBLIC_APP_ENV` variable to show a "QA" badge in the UI.

#### Server-Side Authentication (CRITICAL)

- **Firebase Admin SDK:** The server-side code uses the Firebase Admin SDK to interact with Firestore. In deployed Google Cloud environments like App Hosting, the SDK is automatically initialized using **Application Default Credentials (ADC)**. This means it uses the permissions of the service account associated with the App Hosting backend. **You do not need to inject a service account key as a secret for this to work.**
- **Discord Bot Token:** For periodic server-side checks of a user's Discord roles (i.e., for VIP and Moderator status), the application uses a Discord Bot Token. This is a secret that must be managed in Google Secret Manager and referenced in `apphosting.yaml`. The Bot must be added to your Discord server and have the **`Server Members Intent`** enabled in the Discord Developer Portal under the "Bot" tab. **This is required for the bot to be able to see guild member information and roles.**
- **Other Secrets:** For any other secrets (e.g., third-party API keys), you should store them in Google Secret Manager and reference them in your `apphosting.yaml` files.

#### Linking Backends to Environments

For App Hosting to use an override file, you must set the **Environment name** in the Firebase Console for that backend.

1. In the Firebase Console, select your staging or production project.
2. Navigate to **App Hosting** and select your backend.
3. In the **Settings** tab, find the **Environment** card.
4. Set the **Environment name** to match your file (e.g., `staging` or `production`) and save.

When a deployment runs, App Hosting will merge the base `apphosting.yaml` with the environment-specific file (e.g., `apphosting.staging.yaml`), giving precedence to the environment-specific values.

## 3. Granting Necessary Permissions (CRITICAL)

For the application to function, the App Hosting backend's service account must have the correct IAM roles.

### Using the Google Cloud Console (Manual)

1. Go to the IAM page in the Google Cloud Console for your project.
2. Find the service account associated with your App Hosting backend. It will look like `app-hosting-backend-<ID>@<PROJECT_ID>.iam.gserviceaccount.com`.
3. Grant this service account the necessary roles. At a minimum, this includes roles for interacting with Firebase and Firestore, such as **Firebase Admin** or more granular roles like **Cloud Datastore User**.

**For secrets like `DISCORD_BOT_TOKEN` stored in Secret Manager, you must also grant the "Secret Manager Secret Accessor" role to this same service account.**

Failure to grant the correct roles is the most common cause of `PermissionDenied` errors.

### Using the Firebase CLI (Recommended)

You can also grant access using the Firebase CLI, which simplifies the process as you don't need to manually find the service account email.

1.  Make sure you are logged into the Firebase CLI (`firebase login`).
2.  Run the following command, replacing the placeholders:

```bash
firebase apphosting:secrets:grantaccess [YOUR_SECRET_NAME] --backend [YOUR_BACKEND_ID]
```

- **`[YOUR_SECRET_NAME]`**: The name of your secret in Secret Manager (e.g., `DISCORD_BOT_TOKEN`).
- **`[YOUR_BACKEND_ID]`**: The ID of your App Hosting backend. You can find this in the Firebase Console or by running `firebase apphosting:backends:list`.

## 4. Firestore Security Rules (CRITICAL)

To protect the database, we use `firestore.rules`. These rules are the single source of truth for data access control.

**CRITICAL:** The `firestore.rules` file in your repository is just a configuration file. **It has no effect until you deploy it to your Firebase project.** Failure to deploy the correct rules is a common cause of "Missing or insufficient permissions" errors in the application.

### Deploying Rules

Deploy the rules to your selected Firebase project using the Firebase CLI. After any change to `firestore.rules`, you must run:

```bash
# First, make sure you're targeting the correct project (e.g., your staging or prod project)
firebase use <your-project-id>

# Then, deploy only the Firestore rules
firebase deploy --only firestore:rules
```

## 5. Mock Firestore for Local Development

To simplify local development for contributors who may not have a Firebase project, the application includes a mocked Firestore backend.

- **Activation**: The mock is activated automatically if the server fails to find any Firebase Admin credentials (neither from `.env.local` nor from Google Cloud Application Default Credentials). A warning will be printed in the server console when this happens.
- **Functionality**: It's an in-memory simulation of Firestore. It supports basic reads, writes, and queries, and is pre-populated with sample songs. This allows the UI to be fully functional for development and testing.
- **Limitations**: The data is **not persisted**. It resets every time the server restarts. Advanced Firestore features may not be fully supported.

## 6. Deployment Workflow (CI/CD)

We use **GitHub Actions** to automate deployments. The workflows are defined in the `.github/workflows/` directory. When you push to `main`, the staging workflow runs. When you create a Git tag, the production workflow runs. These workflows correctly use the `apphosting.<ENV>.yaml` files based on the target project.
