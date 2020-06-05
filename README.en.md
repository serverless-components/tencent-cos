# Tencent Cloud Object Storage Component

[简体中文](./README.md) | English

Instantly deploy & manage Tencent Cloud Object Storage buckets with [Serverless Components](https://github.com/serverless/components).

1. [Install](#1-install)
2. [Create](#2-create)
3. [Configure](#3-configure)
4. [Deploy](#4-deploy)
5. [Remove](#5-remove)

&nbsp;

### 1. Install

```console
$ npm install -g serverless
```

### 2. Create

Just create `serverless.yml` and `.env` files

```console
$ touch serverless.yml
$ touch .env # your Tencent API Keys
```

Add the access keys of a [Tencent CAM Role](https://console.cloud.tencent.com/cam/capi) with `AdministratorAccess` in the `.env` file, using this format:

```
# .env
TENCENT_SECRET_ID=123
TENCENT_SECRET_KEY=123
```

- If you don't have a Tencent Cloud account, you could [sign up](https://intl.cloud.tencent.com/register) first.

### 3. Configure

```yml
# serverless.yml

org: orgDemo
app: appDemo
stage: dev
component: cos
name: cosDemo

inputs:
  bucket: my-bucket
  region: ap-guangzhou
```

- [Click here to view the configuration document](https://github.com/serverless-tencent/tencent-cos/tree/v2/docs/configure.md)

### 4. Deploy

```
$ sls deploy
```

### 5. Remove

**NOTE:** Removing the service will cause the used bucket to be emptied and removed as well. This operation cannot be undone.

```
$ sls remove
```

### New to Components?

Checkout the [Serverless Components](https://github.com/serverless/components) repo for more information.
