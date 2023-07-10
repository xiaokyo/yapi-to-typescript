import { Toast, showToast } from "@raycast/api";
import { safe_json_parse, flatObjects, toTypescript } from ".";
import * as prettier from "prettier";

/**
 * transform to typescript interface
 */
export default function handlerToInterface(data: any, yapiHost: string, prefix = "") {
  let typescriptInterfaces = ``;
  let requestFun = ``;

  if (data?.data?.res_body) {
    const { title, method, path: apiPath, project_id, _id, username, req_body_other, res_body } = data.data;
    const path = prefix + apiPath;
    const reqBody = req_body_other ? safe_json_parse(req_body_other) : undefined;
    const resBody = res_body ? safe_json_parse(res_body) : undefined;

    const paths = path?.split("/");
    const names: string[] = paths.map((_: string) => {
      const str = _;
      // Capital case
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
    const jsonResBodyData = jsonResBody?.data?.object;
    resHasList = jsonResBodyData?.records || jsonResBodyData?.list || !!jsonResBody?.data?.content;
    if (resHasList) {
      // has list data
      const list = jsonResBodyData?.records || jsonResBodyData?.list || jsonResBodyData?.content;
      list_key_name = jsonResBodyData?.records
        ? "records"
        : jsonResBodyData?.list
        ? "list"
        : jsonResBodyData?.content
        ? "content"
        : "";
      typescript_list = `
    /**
     * ${title}
     */
    export interface I${name}Item {
      ${toTypescript(list.object)}
    }`;
    }

    const typescript_request = `
    /**
     * Request Params
     */
    export interface I${name}Request {
      ${toTypescript(flatObjects(reqBody))}
    }`;

    const typescript_response = `
    /**
     * Response Data
     */
    export interface I${name}Response {
      ${toTypescript(jsonResBody, { key: list_key_name, value: `I${name}Item[]` })}
    }`;

    typescriptInterfaces = `
    /**
     * document: ${yapiHost}/project/${project_id}/interface/api/${_id} 
     * ${title}, ${String(method).toLocaleUpperCase()}
     * ${path}
     * backend: ${username}
     */
    export interface I${name} {
      request: I${name}Request;
      response: I${name}Response;
    }

    ${typescript_request}

    ${typescript_response}

    ${typescript_list}`;

    requestFun = `
  /**
   * document: ${yapiHost}/project/${project_id}/interface/api/${_id} 
   * ${title}, ${String(method).toLocaleUpperCase()}
   * ${path}
   * backend: ${username}
   */
  request${name}(
    data: I${name}['request']
  ): Promise<I${name}['response']> {
    return request('${path}', {
      method: '${String(method).toLocaleUpperCase()}',
      data,
    });
  }`;
  }

  if (data?.errmsg && data?.errcode !== 0) {
    showToast({ style: Toast.Style.Failure, title: "Something went wrong", message: data.errmsg });
  }

  const typescriptInterfacesPrettier = prettier.format(typescriptInterfaces, {
    parser: "typescript",
    singleQuote: true,
    trailingComma: "all",
    printWidth: 80,
  });

  return {
    requestFun,
    typescriptInterfaces: typescriptInterfacesPrettier,
  };
}
