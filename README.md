# YAPI

yApi's document transform to typescript interfaces

## Quickly Start

- configration yApi host and cookie
- Got a yApi's document id
- typing in raycast's yApi to typescript tool

## example

create a `yapi-to-type.md` file in generater folder

```
API_PREFIX: /product-api
<!-- 新增接口 -->
http://192.168.5.222/project/158/interface/api/220372 
http://192.168.5.222/project/462/interface/api/220390 
http://192.168.5.222/project/158/interface/api/220504

API_PREFIX: /quick-search-product-center
http://192.168.5.222/project/462/interface/api/220396 
<!-- 原有接口 -->
<!-- http://192.168.5.222/project/462/interface/api/32103 -->
http://192.168.5.222/project/462/interface/api/131538
http://192.168.5.222/project/462/interface/api/44584 
http://192.168.5.222/project/462/interface/api/32131 
```

run the command ```genTypescriptInterfaceFilesByIds```

then you will get the `types` and `services` folder in the `generater` folder