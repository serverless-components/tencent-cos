# Tencent Cloud Object Storage Component

Instantly deploy & manage Tencent Cloud Object Storage buckets with [Serverless Components](https://github.com/serverless/components).

**Note:** I've added helpful comments in the `serverless.js` file that explains the typical lifecycle of a this and most other components. [Check it out here.](https://github.com/serverless-tencent/tencent-cos-component/blob/master/serverless.js)

&nbsp;

1. [Install](#1-install)
2. [Create](#2-create)
3. [Configure](#3-configure)
4. [Deploy](#4-deploy)

&nbsp;

### 1. Install

```console
$ npm install -g serverless
```

### 2. Create

Just create `serverless.yml` and `.env` files

```console
$ touch serverless.yml
$ touch .env # your Tenncet API Keys
```

Set Tencent credentials in the `.env` file.

```
# .env
TENCENT_SECRET_ID=123
TENCENT_SECRET_KEY=123
TENCENT_APP_ID=123
```

### 3. Configure

```yml
# serverless.yml

myBucket:
  component: '@serverless/tencent-cos'
  inputs:
    # Required
    Bucket: myBucket-myApiId
    Region: ap-guanzhou
    
    # Optional
    ACL: STRING_VALUE
    GrantRead: STRING_VALUE
    GrantWrite: STRING_VALUE
    GrantFullControl: STRING_VALUE
```

### 4. Deploy

```console
$ serverless
```

### New to Components?

Checkout the [Serverless Components](https://github.com/serverless/components) repo for more information.
