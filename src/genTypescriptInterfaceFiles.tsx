import { Action, ActionPanel, Clipboard, Form, LaunchProps, Toast, getPreferenceValues, showToast } from "@raycast/api";
import axios from "./utils/request";
import handlerToInterface from "./utils/handleToInterface";
import fs from "fs";
import { useEffect, useState } from "react";

interface IProps {
  path: string;
  catId: string;
}

async function Command(props: IProps) {
  try {
    const { path: dir, catId = "21535" } = props;
    // const dir = "/Users/xiaokyo/Documents/works/saas-order-center/src/pages/orderRiskControl";
    // const catId = "21535";
    const preferences = getPreferenceValues<Preferences>();
    const { yapiHost } = preferences;

    const group_list_response = await axios(`/api/interface/list_cat?page=1&limit=100&catid=${catId}`);

    const {
      data: { list: api_groups = [] },
    } = group_list_response.data;

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
      const item = api_groups[i];
      const { tag, _id, title, path, project_id, uid, add_time } = item;
      const data = await axios(`/api/interface/get?id=${_id}`);
      const { requestFun, typescriptInterfaces } = handlerToInterface(data.data, yapiHost);

      const apiName = path.split("/").pop();
      // frist letter to upper
      const importName = "I" + apiName.charAt(0).toUpperCase() + apiName.slice(1);
      const importPath = `../types/${apiName}`;

      imports.push(`import { ${importName} } from '${importPath}';`);
      request_funs.push(requestFun);

      fs.writeFileSync(`${dir}/types/${apiName}.ts`, typescriptInterfaces);
    }

    const services_ts_str = services_ts(request_funs, imports)?.trim();

    fs.writeFileSync(`${dir}/services/index.ts`, services_ts_str);

    showToast({ style: Toast.Style.Success, title: "Success", message: "Write services successfully" });
  } catch (err) {
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

  const [catId, setCateId] = useState<string>("");

  useEffect(() => {
    (async () => {
      const text = await Clipboard.readText();
      text && setPathPlaceholder(text + "...");
    })();
  }, []);

  return (
    <Form
      actions={
        <ActionPanel title="Generator">
          <Action title="Generator to Path" onAction={() => Command({ path: path || pathPlaceholder, catId: catId })} />
        </ActionPanel>
      }
    >
      <Form.TextArea id="path" title="Path" placeholder={pathPlaceholder} value={path} onChange={setPath} />
      <Form.TextField id="cateId" title="CateId" placeholder="YApi CateId" value={catId} onChange={setCateId} />
    </Form>
  );
}