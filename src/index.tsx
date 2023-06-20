import { Action, ActionPanel, Detail, LaunchProps, getPreferenceValues } from "@raycast/api";
import { useFetch } from "@raycast/utils";

interface IProps {
  id: string;
}

function safe_json_parse(str: string) {
  let result = null;
  try {
    result = JSON.parse(str);
  } catch (err: any) {
    result = { errmsg: err.message };
  }

  return result;
}

function formatType(type: string) {
  return (
    {
      integer: `number`,
    }[type] || type
  );
}

function flatObjects(data: any) {
  const result: any = {};
  if (data?.properties) {
    const { properties } = data;
    for (const key in properties) {
      const item = properties[key];
      if (item.type === "object") {
        result[key] = flatObjects(item);
      } else if (item.type === "array" && !item?.items.properties) {
        result[key] = {
          type: `${formatType(item?.items.type)}[]`,
          description: item?.description,
        };
      } else if (item.type === "array") {
        result[key] = flatObjects(item.items);
      } else {
        result[key] = {
          type: formatType(item.type),
          description: item?.description,
        };
      }
    }
  }
  return result;
}

/** 转成typescript字符 */
function toTypescript(data: any, options?: { key?: string; value?: string }) {
  let result = "";
  for (const key in data) {
    const item = data[key];
    const annotation = `/**
     * ${item?.description || "TODO: 未知"}
     * */`;
    if (options && options?.key?.trim() === key?.trim()) {
      result += `
      ${annotation}
      ${key}: ${options?.value};
      `;
    } else {
      if (typeof item === "object" && Object.keys(item).length > 2) {
        result += `
      ${annotation}
      ${key}: { 
        ${toTypescript(item, options)}
      };`;
      } else {
        result += `
      ${annotation}
      ${key}: ${item?.type || "string"};`;
      }
    }
  }
  return result;
}

interface Preferences {
  /** yapi host */
  yapiHost: string;
  /** yapi cookie */
  yapiCookie: string;
}

export default function Command(props: LaunchProps<{ arguments: IProps }>) {
  const { id } = props.arguments;
  const preferences = getPreferenceValues<Preferences>();
  const { yapiHost, yapiCookie } = preferences;
  const { isLoading, data }: any = useFetch(`${yapiHost}/api/interface/get?id=${id}`, {
    headers: {
      "Content-Type": "application/json",
      cookie: yapiCookie,
    },
  });

  let typeApis = ``;
  let requestFun = ``;

  if (data?.data?.res_body) {
    const { title, method, path, project_id, _id, username, req_body_other, res_body } = data.data;
    const reqBody = req_body_other ? safe_json_parse(req_body_other) : undefined;
    const resBody = res_body ? safe_json_parse(res_body) : undefined;

    const paths = path?.split("/");
    const names: string[] = paths.map((_: string) => {
      const str = _;
      // 首字母大写
      return str.charAt(0).toUpperCase() + str.slice(1);
    });

    let name = names[names.length - 1];
    if (names[names.length - 1]?.length < 5) {
      name = names.filter((_, i) => i > names.length - 2).join("");
    }

    let resHasList = false;
    let typescript_list = "";
    let list_key_name = "";
    const jsonResBody = flatObjects(resBody);
    resHasList = !!jsonResBody?.data?.records || !!jsonResBody?.data?.list || !!jsonResBody?.data?.content;
    if (resHasList) {
      // 有列表值的情况
      const list = jsonResBody?.data?.records || jsonResBody?.data?.list || jsonResBody?.data?.content;
      list_key_name = jsonResBody?.data?.records
        ? "records"
        : jsonResBody?.data?.list
        ? "list"
        : jsonResBody?.data?.content
        ? "content"
        : "";
      typescript_list = `
      /**
       * ${title}
       */
        export interface I${name}Item {
          ${toTypescript(list)}
        }
      `;
    }

    const typescript_request = `
    /**
     * 请求参数
     */
    export interface I${name}Request {
      ${toTypescript(flatObjects(reqBody))}
    }
    `;

    const typescript_response = `
    /**
     * 返回参数
     */
    export interface I${name}Response {
      ${toTypescript(flatObjects(resBody), { key: list_key_name, value: `I${name}Item[]` })}
    }
    `;

    typeApis = `
    /**
     * 接口文档地址: ${yapiHost}/project/${project_id}/interface/api/${_id} 
     * ${title}, ${String(method).toLocaleUpperCase()}
     * ${path}
     * 后端: ${username}
     */
    export interface I${name} {
      request: I${name}Request;
      response: I${name}Response;
    }

    ${typescript_request}

    ${typescript_response}

    ${typescript_list}
    `;

    requestFun = `
    /**
     * 接口文档地址: ${yapiHost}/project/${project_id}/interface/api/${_id} 
     * ${title}, ${String(method).toLocaleUpperCase()}
     * ${path}
     * 后端: ${username}
     */
    request${name}(data: I${name}['request']): Promise<I${name}['response']> {
      return request('${path}', {
        method: '${String(method).toLocaleUpperCase()}',
        data,
      });
    }
    `;
  }

  return (
    <Detail
      isLoading={isLoading}
      markdown={typeApis || data?.errmsg || "获取详情失败"}
      actions={
        <ActionPanel title="复制到剪辑板">
          <Action.CopyToClipboard title="复制Typescript" content={typeApis} />
          <Action.CopyToClipboard title="复制Request" content={requestFun} />
        </ActionPanel>
      }
    />
  );
}
