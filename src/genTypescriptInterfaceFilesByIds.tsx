import { Action, ActionPanel, Clipboard, Form, Toast, getPreferenceValues, showToast } from "@raycast/api";
import axios, { login } from "./utils/request";
import handlerToInterface from "./utils/handleToInterface";
import fs from "fs";
import path from "path";
import { useEffect, useState } from "react";
import * as prettier from "prettier";

interface MDItem {
  id: string;
  apiPrefix: string;
}

/**
 * handle input ids
 * http://192.168.5.222/project/158/interface/api/220372 
http://192.168.5.222/project/462/interface/api/220390 
http://192.168.5.222/project/462/interface/api/220396 
http://192.168.5.222/project/158/interface/api/220504 
http://192.168.5.222/project/462/interface/api/32103 
http://192.168.5.222/project/462/interface/api/131538 
http://192.168.5.222/project/462/interface/api/44584 
http://192.168.5.222/project/462/interface/api/32131
返回每行的斜杠最后的id
 */
function readLineGetIds(val: string): MDItem[] {
  const result: MDItem[] = [];
  let apiPrefix = "";
  for (const line of val.split("\n")) {
    if (/^API_PREFIX:/.test(line)) {
      apiPrefix = line.split(":")[1].trim();
      continue; // 下一行
    }
    if (!/^<!--/.test(line) && line.includes("/interface/api/")) {
      const id = line.split("/").pop() || "";
      result.push({ id, apiPrefix });
    }
  }
  return result;
}

/**
 * 从指定目录读取yapi-to-type.txt文件并提取API IDs
 * @param dirPath 目录路径
 * @returns API IDs数组
 */
function readIdsFromFile(dirPath: string): MDItem[] {
  try {
    const filePath = path.join(dirPath, "yapi-to-type.md");

    // 检查文件是否存在
    if (!fs.existsSync(filePath)) {
      showToast({
        style: Toast.Style.Failure,
        title: "文件不存在",
        message: `在路径 ${dirPath} 中未找到 yapi-to-type.md 文件`,
      });
      return [];
    }

    // 读取文件内容
    const fileContent = fs.readFileSync(filePath, "utf-8");

    // 使用readLineGetIds提取IDs
    const ids = readLineGetIds(fileContent);
    console.log("%csrc/genTypescriptInterfaceFilesByIds.tsx:55 ids", "color: #007acc;", ids);
    showToast({
      style: Toast.Style.Success,
      title: "文件读取成功",
      message: `从 yapi-to-type.md 中读取到 ${ids.length} 个API ID`,
    });

    return ids;
  } catch (error) {
    showToast({
      style: Toast.Style.Failure,
      title: "读取文件失败",
      message: (error as Error).message,
    });
    return [];
  }
}

interface IProps {
  path: string;
  ids: MDItem[];
}

async function Command(props: IProps) {
  try {
    const { path: dir, ids: api_groups } = props;
    const preferences = getPreferenceValues<Preferences>();
    const { yapiHost } = preferences;
    const newCookie = await login();

    const services_ts = (request_funs: string[], imports: string[]) => `
import request from '@/utils/request';
${imports.join("\n")}

export default {
  ${request_funs.join(",\n")}
}
`;

    const request_funs: string[] = [];
    const imports: string[] = [];
    for (let i = 0; i < api_groups.length; i++) {
      const { id: _id, apiPrefix } = api_groups[i];
      const data = await axios(`/api/interface/get?id=${_id}`, { headers: { cookie: newCookie } });
      const { requestFun, typescriptInterfaces, name } = handlerToInterface(data.data, yapiHost, apiPrefix);

      if (
        requestFun?.indexOf("废弃") > -1 ||
        requestFun?.indexOf("deprecated") > -1 ||
        typescriptInterfaces.indexOf("废弃") > -1 ||
        typescriptInterfaces.indexOf("deprecated") > -1
      )
        continue;

      const apiName = `${name}`;
      // frist letter to upper
      const importName = "I" + apiName.charAt(0).toUpperCase() + apiName.slice(1);
      const importPath = `../types/${apiName}`;

      imports.push(`import { ${importName} } from '${importPath}';`);
      request_funs.push(requestFun);

      fs.writeFileSync(`${dir}/types/${apiName}.ts`, typescriptInterfaces);
    }

    const services_ts_str = services_ts(request_funs, imports)?.trim();

    fs.writeFileSync(
      `${dir}/services/index.ts`,
      prettier.format(services_ts_str, {
        parser: "typescript",
        singleQuote: true,
        trailingComma: "all",
        printWidth: 80,
      })
    );

    showToast({ style: Toast.Style.Success, title: "Success", message: "Write services successfully" });
  } catch (err) {
    console.log("%csrc/genTypescriptInterfaceFilesByIds.tsx:79 err", "color: #007acc;", err);
    showToast({
      style: Toast.Style.Failure,
      title: "Something went wrong",
      message: (err as { message: string }).message,
    });
  }
}

export default function View() {
  const [path, setPath] = useState<string>("");
  const [pathPlaceholder, setPathPlaceholder] = useState<string>("");

  useEffect(() => {
    (async () => {
      const text = await Clipboard.readText();
      text && setPathPlaceholder(text);
    })();
  }, []);

  return (
    <Form
      actions={
        <ActionPanel title="Generator">
          <Action
            title="Read From File and Generator"
            onAction={() => {
              const targetPath = path || pathPlaceholder;
              if (!targetPath) {
                showToast({
                  style: Toast.Style.Failure,
                  title: "Path Error",
                  message: "Please fill in the project path",
                });
                return;
              }
              const idItems = readIdsFromFile(targetPath);
              Command({ path: targetPath, ids: idItems });
            }}
          />
        </ActionPanel>
      }
    >
      <Form.TextArea id="path" title="Path" placeholder={`${pathPlaceholder}`} value={path} onChange={setPath} />
    </Form>
  );
}
