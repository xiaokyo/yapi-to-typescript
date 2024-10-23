import { Action, ActionPanel, Detail, LaunchProps, Toast, getPreferenceValues, showToast } from "@raycast/api";
import handlerToInterface from "./utils/handleToInterface";
import { useEffect, useState } from "react";
import axios, { login } from "./utils/request";

interface IProps {
  id: string;
}

interface Preferences {
  /** yapi host */
  yapiHost: string;
  /** yapi cookie */
  // yapiCookie: string;
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
  }, [data]);

  return {
    typescriptInterfaces,
    requestFun,
    isLoading,
  };
};

export default function Command(props: LaunchProps<{ arguments: IProps }>) {
  const { id } = props.arguments;
  const preferences = getPreferenceValues<Preferences>();
  const { yapiHost } = preferences;

  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [data, setData] = useState<any>(null);

  useEffect(() => {
    setIsLoading(true);
    login().then((newCookie) => {
      axios({
        url: `/api/interface/get?id=${id}`,
        method: "GET",
        headers: {
          cookie: newCookie,
        },
      }).then((data) => {
        setData(data?.data);
        setIsLoading(false);
      });
    });
  }, []);

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
