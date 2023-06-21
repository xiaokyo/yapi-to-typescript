import { Action, ActionPanel, Detail, LaunchProps, getPreferenceValues } from "@raycast/api";
import { useFetch } from "@raycast/utils";
import handlerToInterface from "./utils/handleToInterface";

interface IProps {
  id: string;
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

  const { typescriptInterfaces, requestFun } = handlerToInterface(data, yapiHost);

  return (
    <Detail
      isLoading={isLoading}
      markdown={typescriptInterfaces || data?.errmsg}
      actions={
        <ActionPanel title="Copy Clipboard">
          <Action.CopyToClipboard title="Copy Typescript" content={typescriptInterfaces} />
          <Action.CopyToClipboard title="Copy Request" content={requestFun} />
        </ActionPanel>
      }
    />
  );
}
