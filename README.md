# gcf-ddns

Implementation of DynDns update protocol as a Google Cloud Function to
dynamically update records in Google Cloud DNS.

## Usage

Rename `domains.sample.json` to `domains.json` and edit accordingly with your
Google Cloud project, domain, zone name, and dynamic records with credentials of
your choosing.

### Run locally before deploying

`npm install` to pull in dependencies.

#### Create Service Account and its key

You will need to create a service account and a key for it to be able to access
Cloud DNS API and make changes locally.

```
$ gcloud iam service-accounts create \
  dnsadmin@YOUR_PROJECT_ID.iam.gserviceaccount.com

$ gcloud projects add-iam-policy-binding YOUR_PROJECT_ID \
  --member serviceAccount:dnsadmin@YOUR_PROJECT_ID.iam.gserviceaccount.com \
  --role roles/dns.admin

$ gcloud iam service-accounts keys create \
  dnsadmin.creds.json \
  --iam-account dnsadmin@YOUR_PROJECT_ID.iam.gserviceaccount.com
```

#### Start the emulator

Use `npm start` to start the local Cloud Functions emulator and deploy the
function under `/nic`.
```
$ GOOGLE_APPLICATION_CREDENTIALS=dnsadmin.creds.json npm start
```

### Deploy to Production

`npm run-script deploy-prod` will use `gcloud` command and deploy the function
to production.


## Test

There are no unit or integration tests, yet.
In the mean time, you can "test in production" just with `curl`.

```
# Set an IPv6 address for test.example.com
$ curl -u test_username:test_password \
  'https://us-central1-YOUR_PROJECT_ID.cloudfunctions.net/nic/update?hostname=test.example.com&myip=2001:DB8:7357::bdd'

# Set the IPv4 address of test.example.com to client IP
$ curl -4 -u test_username:test_password \
  'https://us-central1-YOUR_PROJECT_ID.cloudfunctions.net/nic/update?hostname=test.example.com'
```

## Logs

Both success and failure logs of the function goes to its console. You can read
them from the local emulator with `functions read logs`, and from production
with `gcloud beta functions logs read` commands.
