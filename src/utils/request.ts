import { getPreferenceValues } from "@raycast/api";
import axios from "axios";

const preferences = getPreferenceValues<Preferences>();
const { yapiHost } = preferences;

const instance = axios.create({
  baseURL: yapiHost,
  headers: {
    "Content-Type": "application/json",
  },
});

export async function login() {
  const loginResult = await instance({
    url: "/api/user/login",
    method: "POST",
    data: {
      email: "xiaokyo@cjdropshipping.co",
      password: "zwj19961118",
    },
  });

  const newCookie = loginResult.headers["set-cookie"]
    ?.reduce((prev: string[], cur: string) => {
      const thisCookie = cur.split(";")?.[0];
      prev.push(thisCookie);
      return prev;
    }, [])
    .join(";");

  return newCookie;
}

export default instance;
