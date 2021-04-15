# 配置文档

## 完整配置

```yml
# serverless.yml

app: appDemo # (否) 该应用名称
stage: dev # (否) 用于区分环境信息，默认值为 dev

component: cos # (是) 组件名称，此处为 cos
name: cos-demo # (是) 实例名称

inputs:
  src:
    src: ./
    exclude:
      - .env
  bucket: my-bucket
  targetDir: /
  protocol: https
  region: ap-guangzhou
  replace: false # ⚠️⚠️⚠️部署时会先清理桶内所有文件，谨慎使用！！！
  website: false
  websiteConfig:
    index: index.html
    error: index.html
    ignoreHtmlExt: false # 是否是否忽略 html 扩展名，默认 false
    disableErrorStatus: false # 是否禁用错误码，默认 false
  acl:
    permissions: private
    grantRead: id="1234567"
    grantWrite: id="1234567"
    grantFullControl: id="1234567"
  cors:
    - maxAgeSeconds: 0
      allowedMethods:
        - GET
      allowedOrigins:
        - '*'
      allowedHeaders:
        - '*'
      exposeHeaders:
        - ''
  tags:
    - key: abc
      value: xyz
  policy:
    - Principal:
        qcs:
          - 'qcs::cam::anyone:anyone'
      Effect: 'Allow'
      Action:
        - 'name/cos:HeadBucket'
        - 'name/cos:ListMultipartUploads'
        - 'name/cos:ListParts'
        - 'name/cos:GetObject'
        - 'name/cos:HeadObject'
        - 'name/cos:OptionsObject'
      Resource:
        - qcs::cos:ap-guangzhou:uid/123456789:my-bucket-123456789/*
    - Principal:
        qcs:
          - 'qcs::cam::uin/10023456789:uin/10023456789'
      Effect: 'Deny'
      Action:
        - 'name/cos:*'
      Resource:
        - qcs::cos:ap-guangzhou:uid/123456789:my-bucket-123456789/*
```

## 配置说明

主要参数说明

| 参数          | 必选 |              类型               | 默认值  | 描述                                                                         |
| ------------- | :--: | :-----------------------------: | :-----: | :--------------------------------------------------------------------------- |
| bucket        |  是  |             string              |         | 存储桶名称，如若不添加 AppId 后缀，则系统会自动添加，后缀为大写              |
| region        |  是  |             string              |         | 存储桶所属的区域                                                             |
| src           |  否  |             string              |         | 要上传到存储桶的文件或目录                                                   |
| targetDir     |  否  |             string              |   `/`   | 要上传到存储桶的目标目录，默认目录是根路径 `/`                               |
| protocol      |  否  |             string              | `https` | 访问协议                                                                     |
| acl           |  否  |           [Acl](#Acl)           |         | 访问控制配置                                                                 |
| cors          |  否  |         [Cors](#Cors)[]         |         | 跨域资源共享配置                                                             |
| tags          |  否  |          [Tag](#Tag)[]          |         | 标签配置                                                                     |
| policy        |  否  |        [Policy](#Policy)        |         | 策略控制配置                                                                 |
| replace       |  否  |             boolean             | `false` | 是否是替换式部署，如果为 `true`，部署时将 `先删除对应 bucket 的所有旧文件`。 |
| website       |  否  |             boolean             | `false` | 是否开启静态网站能力                                                         |
| websiteConfig |  否  | [WebsiteConfig](#WebsiteConfig) |         | 静态网站相关配置，只有 `website` 为 `true` 时才生效                          |

### Acl

| 参数             | 必选 |  类型  |   默认    | 描述                                                                                                                       |
| ---------------- | :--: | :----: | :-------: | :------------------------------------------------------------------------------------------------------------------------- |
| permissions      |  否  | string | `private` | 定义存储桶的访问控制列表(ACL)属性。 有关枚举值（如 private、public-read），请参阅[ACL 概述][acl]中的“存储桶的预设 ACL”部分 |
| grantRead        |  否  | string |           | 授予读取权限，以 `id ="OwnerUin"` 格式授权对存储桶读取的权限，例如 id="100000000001"                                       |
| grantWrite       |  否  | string |           | 授予写入权限，以 `id ="OwnerUin"` 格式授权对存储桶写入的权限，例如 id="100000000001"                                       |
| grantFullControl |  否  | string |           | 授予全权控制权限，以 `id ="OwnerUin"` 格式授权对存储桶全权控制的权限，例如 id="100000000001"                               |

### Cors

| 参数           | 必选 |   类型   | 描述                                                                                          |
| -------------- | :--: | :------: | :-------------------------------------------------------------------------------------------- |
| id             |  是  |  string  | 配置规则的                                                                                    |
| maxAgeSeconds  |  是  |  number  | 设置 OPTIONS 请求得到结果的有效期                                                             |
| allowedMethods |  是  | string[] | 允许的 HTTP 操作，枚举值：GET，PUT，HEAD，POST，DELETE                                        |
| allowedOrigins |  是  | string[] | 允许的访问来源，支持通配符 `*`，格式为：`协议://域名[:端口]`，例如：http://www.qq.com         |
| allowedHeaders |  是  | string[] | 在发送 OPTIONS 请求时告知服务端，接下来的请求可以使用哪些自定义的 HTTP 请求头部，支持通配符\* |
| exposeHeaders  |  是  | string[] | 设置浏览器可以接收到的来自服务器端的自定义头部信息                                            |

### Tag

| 参数  | 必选 |  类型  | 描述                                                                                                    |
| ----- | :--: | :----: | :------------------------------------------------------------------------------------------------------ |
| key   |  是  | string | 标签的 Key，长度不超过 128 字节, 支持英文字母、数字、空格、加号、减号、下划线、等号、点号、冒号、斜线   |
| value |  是  | string | 标签的 Value，长度不超过 256 字节, 支持英文字母、数字、空格、加号、减号、下划线、等号、点号、冒号、斜线 |

### Policy

参考 [COS API 授权策略使用指引][policy-use] 和 [访问策略语言概述][policy-introduction]

> 注意：`Principal`、`Effect`、`Action`、`Resource` 均为首字母大写

### WebsiteConfig

静态网站相关配置

| 参数               | 必选 |  类型   | 描述         |
| ------------------ | :--: | :-----: | :----------- |
| index              |  否  | string  | `index.html` | 网站 index 页面 |
| error              |  否  | string  | `error.html` | 网站 error 页面 |
| disableErrorStatus |  否  | boolean | `false`      | 是否禁用错误码，默认 false，不存在文件会返回 404；如果禁用，就会返回 200 |
| ignoreHtmlExt      |  否  | boolean | `false`      | 是否忽略 html 扩展名，默认 false |

<!-- links -->

[acl]: https://cloud.tencent.com/document/product/436/30752
[policy-use]: https://cloud.tencent.com/document/product/436/31923
[policy-introduction]: https://cloud.tencent.com/document/product/436/18023
