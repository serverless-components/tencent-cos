# Configure document

## Complete configuration

```yml
# serverless.yml

myBucket:
  component: '@serverless/tencent-cos'
  inputs:
    bucket: my-bucket
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

## Configuration description

Main param description

| Param        | Required/Optional    |   Description |
| --------     | :-----:              |  :----      |
| bucket       | Required             | Bucket name, if you don't add the AppId suffix, it will be added automatically for you, capital letters are not allowed |
| region | Required             |   |
| [acl](#acl-param-description) | Optional  | Access control list |
| [cors](#cors-param-description)| Optional | Cross-origin resource sharing |
| [tags](#tags-param-description)| Optional | Tag list |


### acl param description

| Param        | Required/Optional  |  Description |
| --------     | :-----:         |  :----      |
| permissions      | Optional    | This defines the access control list (ACL) attribute of the bucket. For the enumerated values such as private and public-read, see the Preset ACL for Buckets section in ACL Overview. Default value: private |
| grantRead   | Optional       | This grants the grantee permission to read the bucket in the format of id="\[OwnerUin]", such as id="100000000001". Multiple grantees can be separated by comma (,), such as id="100000000001",id="100000000002" |
| grantWrite  | Optional          |This grants the grantee permission to write to the bucket in the format of id="\[OwnerUin]", such as id="100000000001". Multiple grantees can be separated by comma (,), such as id="100000000001",id="100000000002" |
| grantFullControl    | Optional        | This grants the grantee full permission to manipulate the bucket in the format of id="\[OwnerUin]", such as id="100000000001". Multiple grantees can be separated by comma (,), such as id="100000000001",id="100000000002" |


### cors param description

| Param        | Required/Optional    |  Description |
| --------     | :-----:              |   :----      |
| id      | Required             | Configured rule ID; optional	 |
| allowedMethods   | Required             |  Allowed HTTP operations. Enumerated values: GET, PUT, HEAD, POST, DELETE |
| allowedOrigins  | Required             |      Allowed origin in the format of protocol://domain name\[:port number], such as http://www.qq.com. Wildcard * is supported      |
| allowedHeaders    | Required            |     Tells the server what custom HTTP request headers can be used for subsequent requests when the OPTIONS request is sent. Wildcard * is supported      |
| exposeHeaders    | Required            |     Sets custom header information from the server that the browser can receive      |


### tags param description

| Param        | Required/Optional    |  Description |
| --------     | :-----:              |   :----      |
| key      | Required             | Tag key, which can contain up to 128 bytes of letters, digits, spaces, plus signs, minus signs, underscores, equal signs, dots, colons, and slashes |
| value   | Required             |  Tag value, which can contain up to 256 bytes of letters, digits, spaces, plus signs, minus signs, underscores, equal signs, dots, colons, and slashes |

