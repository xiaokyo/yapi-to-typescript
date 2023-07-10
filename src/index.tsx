import {
  Action,
  ActionPanel,
  Clipboard,
  Detail,
  LaunchProps,
  Toast,
  getPreferenceValues,
  showToast,
} from "@raycast/api";
import { useFetch } from "@raycast/utils";
import handlerToInterface from "./utils/handleToInterface";
import { useEffect, useState } from "react";

interface IProps {
  id: string;
}

interface Preferences {
  /** yapi host */
  yapiHost: string;
  /** yapi cookie */
  yapiCookie: string;
}

const useInterfaceContent = (data: any, yapiHost: string) => {
  const [typescriptInterfaces, setTypeScriptInterfaces] = useState<string>("");
  const [requestFun, setRequestFun] = useState<string>("");
  const [isLoading, setIsLoading] = useState<boolean>(true);

  useEffect(() => {
    (async () => {
      try {
        const { requestFun, typescriptInterfaces } = handlerToInterface(data, yapiHost);
        setTypeScriptInterfaces(typescriptInterfaces);
        setRequestFun(requestFun);
        setIsLoading(false);
      } catch (err) {
        showToast({ style: Toast.Style.Failure, title: "Parse Error", message: (err as unknown as any).message });
      }
    })();
  }, []);

  return {
    typescriptInterfaces,
    requestFun,
    isLoading,
  };
};

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

  const { typescriptInterfaces, requestFun, isLoading: parseLoading } = useInterfaceContent(data, yapiHost);

  return (
    <Detail
      isLoading={isLoading || parseLoading}
      markdown={"````" + typescriptInterfaces || data?.errmsg + "````"}
      actions={
        <ActionPanel title="Copy Clipboard">
          <Action.CopyToClipboard title="Copy Typescript" content={typescriptInterfaces} />
          <Action.CopyToClipboard title="Copy Request" content={requestFun} />
        </ActionPanel>
      }
    />
  );
}
