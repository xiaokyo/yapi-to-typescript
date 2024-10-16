interface Error {
  message: string;
}

export function safe_json_parse(str: string) {
  let result = null;
  try {
    result = JSON.parse(str);
  } catch (err: unknown) {
    result = { errmsg: (err as Error).message };
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

export function flatObjects(data: any) {
  const result: any = {};
  const { properties } = data || {};
  for (const key in properties || {}) {
    const item = properties[key];
    if (item.type === "object") {
      result[key] = {
        type: formatType(item.type),
        description: item?.description,
        object: flatObjects(item),
      };
    } else if (item.type === "array" && !item?.items?.properties) {
      result[key] = {
        type: `${formatType(item?.items?.type)}[]`,
        description: item?.description,
      };
    } else if (item.type === "array") {
      result[key] = {
        type: formatType(item.type),
        description: item?.description,
        object: flatObjects(item.items),
      };
    } else {
      result[key] = {
        type: formatType(item.type),
        description: item?.description,
      };
    }
  }
  return result;
}

/** transform to typescript interface */
export function toTypescript(data: any, options?: { key?: string; value?: string }) {
  let result = "";
  for (const key in data || {}) {
    const item = data[key];
    const annotation = `/**
          * ${item?.description || "后端未设置备注: unknow"}
          * */`;

    if (options?.key?.trim() === key?.trim()) {
      result += `
        ${annotation}
        ${key}: ${options.value};
        `;
    } else {
      if (item?.type === "object" || item?.type === "array") {
        const type = item.type;
        let value = Object.keys(item.object || {}).length > 0 ? `{ ${toTypescript(item.object, options)} }` : "any";
        if (type === "array") {
          value = `Array<${value}>`
        }
        result += `
          ${annotation}
          ${key}: ${value};`;
      } else {
        let type = isUndefinedStr(item.type) ? "any" : item.type;
        if (item?.type?.includes("[]") && !String(type).includes('[]')) type += "[]";
        result += `
          ${annotation}
          ${key}: ${type || "string"};`;
      }
    }
  }
  return result;
}

function isUndefinedStr(str: string) {
  return str?.includes("undefined") || str?.includes("null");
}
