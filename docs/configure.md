# 配置文档

## 完整配置

```yml
# serverless.yml

component: cos # (必填) 组件名称，此处为 cos
name: cos-demo # (必填) 实例名称
org: orgDemo # (可选) 用于记录组织信息，默认值为您的腾讯云账户 appid
app: appDemo # (可选) 该应用名称
stage: dev # (可选) 用于区分环境信息，默认值为 dev

inputs:
  src: ./
  bucket: my-bucket
  website: false
  targetDir: /
  protocol: https
  region: ap-guangzhou
  acl:
    permissions: private
    grantRead: id="1234567"
    grantWrite: id="1234567"
    grantFullControl: id="1234567"
  cors:
    - id: abc
      maxAgeSeconds: '10'
      allowedMethods:
        - GET
      allowedOrigins:
        - https://tencent.com
      allowedHeaders:
        - FIRST_ALLOWED_HEADER
      exposeHeaders:
        - FIRST_EXPOSED_HEADER
  tags:
    - key: abc
      value: xyz
```

## 配置说明

主要参数说明

| 参数      | 必填/可选 | 默认值  | 描述                                                            |
| --------- | :-------: | :-----: | :-------------------------------------------------------------- |
| bucket    |   必填    |         | 存储桶名称，如若不添加 AppId 后缀，则系统会自动添加，后缀为大写 |
| region    |   必填    |         | 存储桶所属的区域                                                |
| src       |   可选    |         | 要上传到存储桶的文件或目录                                      |
| targetDir |   可选    |   `/`   | 要上传到存储桶的目标目录，默认目录是根路径 `/`                  |
| website   |   可选    | `false` | 是否开放网站访问                                                |
| protocol  |   可选    | `http`  | 访问协议                                                        |
| acl       |   可选    |         | 访问控制配置，配置参数参考[acl 参数说明](#acl-参数说明)         |
| cors      |   可选    |         | 跨域资源共享配置，配置参数参考[cors 参数说明](#cors-参数说明)   |
| tags      |   可选    |         | 标签配置，配置参数参考[tags 参数说明](#tags-参数说明)           |

### acl 参数说明

| 参数             | 必填/可选 | 描述                                                                                                                                                                                            |
| ---------------- | :-------: | :---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| permissions      |   可选    | 定义存储桶的访问控制列表(ACL)属性。 有关枚举值（如 private、public-read），请参阅[ACL 概述](https://cloud.tencent.com/document/product/436/30752)中的“存储桶的预设 ACL”部分。 默认值: `private` |
| grantRead        |   可选    | 授予读取权限，以 id =“\[OwnerUin]”格式授权对存储桶读取的权限，例如 id="100000000001"                                                                                                            |
| grantWrite       |   可选    | 授予写入权限，以 id="\[OwnerUin]"格式授权对存储桶写入的权限，例如 id="100000000001"                                                                                                             |
| grantFullControl |   可选    | 授予全权控制权限，以 id="\[OwnerUin]"格式授权对存储桶全权控制的权限，例如 id="100000000001"                                                                                                     |

### cors 参数说明

| 参数           | 必填/可选 | 描述                                                                                          |
| -------------- | :-------: | :-------------------------------------------------------------------------------------------- |
| id             |   可选    | 配置规则的 ID，可选填                                                                         |
| allowedMethods |   必填    | 允许的 HTTP 操作，枚举值：GET，PUT，HEAD，POST，DELETE                                        |
| allowedOrigins |   必填    | 允许的访问来源，支持通配符\*，格式为：`协议://域名[:端口]`，例如：http://www.qq.com           |
| allowedHeaders |   必填    | 在发送 OPTIONS 请求时告知服务端，接下来的请求可以使用哪些自定义的 HTTP 请求头部，支持通配符\* |
| exposeHeaders  |   必填    | 设置浏览器可以接收到的来自服务器端的自定义头部信息                                            |
| maxAgeSeconds  |   必填    | 设置 OPTIONS 请求得到结果的有效期                                                             |

### tags 参数说明

| 参数  | 必填/可选 | 描述                                                                                                    |
| ----- | :-------: | :------------------------------------------------------------------------------------------------------ |
| key   |   必填    | 标签的 Key，长度不超过 128 字节, 支持英文字母、数字、空格、加号、减号、下划线、等号、点号、冒号、斜线   |
| value |   必填    | 标签的 Value，长度不超过 256 字节, 支持英文字母、数字、空格、加号、减号、下划线、等号、点号、冒号、斜线 |
