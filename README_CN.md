# 腾讯云COS组件

## 简介
该组件是serverless-tencent组件库中的基础组件之一。通过COS组件，可以快速，方便的创建，配置和管理腾讯云的COS存储桶

## 快速开始

通过COS组件，对一个COS存储桶进行完整的创建，配置，部署和删除等操作。支持命令如下：

1. [安装](#1-安装)
2. [创建](#2-创建)
3. [配置](#3-配置)
4. [部署](#4-部署)
5. [移除](#5-移除)


### 1. 安装

通过npm安装serverless

```console
$ npm install -g serverless
```

### 2. 创建

本地创建 `serverless.yml` 和 `.env` 两个文件

```console
$ touch serverless.yml
$ touch .env # your Tencent API Keys
```

在 `.env` 文件中配置腾讯云的APPID，SecretId和SecretKey信息并保存

```
# .env
TENCENT_SECRET_ID=123
TENCENT_SECRET_KEY=123
TENCENT_APP_ID=123
```

### 3. 配置

在serverless.yml中进行如下配置

```yml
# serverless.yml

myBucket:
  component: '@serverless/tencent-cos'  # 添加依赖的cos组件
  inputs:
    # Required
    Bucket: myBucket-1300418943  # 存储桶后缀需要填写APPID信息
    Region: ap-guangzhou   # 需要部署存储桶的地域信息

    # ACL配置 (可选)
    ACL:
      Permissions: private
      GrantRead: STRING_VALUE
      GrantWrite: STRING_VALUE
      GrantFullControl: STRING_VALUE

    # CORS配置 (可选)
    CORS:
      - ID: abc
        MaxAgeSeconds: '10'
        AllowedMethods:
          - GET
        AllowedOrigins:
          - https://tencent.com
        AllowedHeaders:
          - FIRST_ALLOWED_HEADER
        ExposeHeaders:
          - FIRST_EXPOSED_HEADER

    # Tags标签配置 (可选)
    Tags:
      - Key: abc
        Value: xyz
      - Key: abc
        Value: xyz
```

### 4. 部署

通过如下命令进行部署，并查看部署过程中的信息
```console
$ serverless --debug
```

### 5. 移除

通过以下命令移除部署的存储桶
```console
$ serverless remove --debug
```

### 还支持哪些组件？

可以在 [Serverless Components](https://github.com/serverless/components) repo 中查询更多组件的信息。
