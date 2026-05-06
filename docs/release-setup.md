# Android Release Setup (GitHub Actions + Play Store)

This project builds Android artifacts from `.github/workflows/build-android.yml` on `v*` tags.

## What the workflow does

- Builds `app-release.apk` and `app-release.aab`
- Publishes both files to GitHub Releases
- Optionally uploads the AAB to Google Play `internal` track (when secrets are configured)

## Required secrets for persistent signing

Add these repository secrets in GitHub:

- `ANDROID_RELEASE_KEYSTORE_BASE64`
- `ANDROID_RELEASE_KEY_ALIAS`
- `ANDROID_RELEASE_STORE_PASSWORD`
- `ANDROID_RELEASE_KEY_PASSWORD`

How to generate base64:

```bash
base64 -w 0 your-release.keystore
```

Use the output as `ANDROID_RELEASE_KEYSTORE_BASE64`.

## Required secret for Play upload

- `GOOGLE_PLAY_SERVICE_ACCOUNT_JSON`

This should be the raw JSON for a Google Cloud service account with Play Console API access to your app.

## Play Console prerequisites

- App exists in Play Console with package: `com.featherpunch.app`
- Service account is granted access in Play Console (Users and permissions)
- Service account has permissions to upload to the desired track

## Triggering a release

Push a tag:

```bash
git tag -a v2.0.3 -m "Release v2.0.3"
git push origin v2.0.3
```

The workflow will:

1. Build APK + AAB
2. Create GitHub Release with artifacts
3. Upload AAB to internal track if Play secret is set

## Fallback behavior

If signing secrets are missing, workflow falls back to a generated debug keystore.
That build is useful for testing but will not be install-upgrade compatible with prior release-signed installs.
