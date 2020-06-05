# 腾讯云对象存储 COS 组件

简体中文 | [English](./README.en.md)

## 简介

通过对象存储 COS 组件，可以快速，方便的创建，配置和管理腾讯云的 COS 存储桶

## 快速开始

通过 COS 组件，对一个 COS 存储桶进行完整的创建，配置，部署和删除等操作。支持命令如下：

1. [安装](#1-安装)
2. [配置](#2-配置)
3. [部署](#3-部署)
4. [移除](#4-移除)

### 1. 安装

通过 npm 安装 serverless

```console
$ npm install -g serverless
```

### 2. 配置

本地创建 `serverless.yml` 文件，在其中进行如下配置

```console
$ touch serverless.yml
```

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

- [点击此处查看配置文档](/docs/configure.md)

### 3. 部署

如您的账号未[登陆](https://cloud.tencent.com/login)或[注册](https://cloud.tencent.com/register)腾讯云，您可以直接通过`微信`扫描命令行中的二维码进行授权登陆和注册。

通过`sls`命令进行部署，并可以添加`--debug`参数查看部署过程中的信息

```
$ sls deploy
```

### 4. 移除

**注意：**删除服务将导致用过的存储桶也被清空和删除。此操作无法撤消。

通过以下命令移除部署的存储桶

```
$ sls remove
```

#### 账号配置（可选）

当前默认支持 CLI 扫描二维码登录，如您希望配置持久的环境变量/秘钥信息，也可以本地创建 `.env` 文件

```console
$ touch .env # 腾讯云的配置信息
```

在 `.env` 文件中配置腾讯云的 SecretId 和 SecretKey 信息并保存。

```
# .env
TENCENT_SECRET_ID=123
TENCENT_SECRET_KEY=123
```

> 如果没有腾讯云账号，请先 [注册新账号](https://cloud.tencent.com/register)。如果已有腾讯云账号，可以在 [API 密钥管理](https://console.cloud.tencent.com/cam/capi) 中获取 SecretId 和 SecretKey。

### 还支持哪些组件？

可以在 [Serverless Components](https://github.com/serverless/components) repo 中查询更多组件的信息。
