import { getPreferenceValues } from "@raycast/api";
import axios from "axios";

const preferences = getPreferenceValues<Preferences>();
const { yapiHost, yapiCookie } = preferences;

const instance = axios.create({
  baseURL: yapiHost,
  headers: {
    cookie: yapiCookie,
    "Content-Type": "application/json",
  },
});

export default instance;
