import axios from "axios";
// @ts-ignore
import { getTokenInfo, isEmptyObj, jsonSort, guid } from "@bj-nsc/functions";
import md5 from "md5";
// @ts-ignore
import queryString from "query-string";

const parseData = (data) => {
  const obj = {};
  const s = data;
  const arr = s.split("&");

  arr.forEach((str) => {
    const arr2 = decodeURIComponent(str).split("=");
    const [key, value] = arr2;
    if (key === "theme") {
      obj[key] = value;
    } else {
      obj[key] = value;
    }
  });

  return obj;
};

const baseUrl = "";

const ajax = axios.create({
  // @ts-ignore
  baseUrl,
  timeout: 1000 * 30, // 设置超时30秒
  headers: {
    "Content-Type": "application/json",
  },
});

// ajax.defaults.baseURL = 'https://api.example.com'; // 修改实例的默认配置
// ajax.defaults.headers.post['Content-Type'] = 'application/x-www-form-urlencoded';

// 最后执行的请求拦截器
// @ts-ignore
ajax.interceptors.request.useAfter = (fn) => {
  // @ts-ignore
  const handlers = ajax.interceptors.request.handlers;
  const p = {
    rejected: undefined,
    fulfilled: fn,
  };
  handlers.unshift(p);
};

// ajax.defaults.headers.common['Authorization'] = token;

//添加请求拦截器
ajax.interceptors.request.use(function (config) {
  if (
    // @ts-ignore
    !config.noPrefix &&
    !config.url.includes("/api") &&
    !config.url.startsWith("http") &&
    !config.url.startsWith("//")
  ) {
    config.url = `/api${config.url}`;
  }
  if (!config.headers.Authorization) {
    config.headers.Authorization = getTokenInfo();
  }

  const url = config.url;

  // 不需要传Authorization的接口
  const noHeaders = ["/security/captcha/type", "/security/encrypt/rsa"];

  const isNoAuth = noHeaders.some((str) => url.includes(str));

  const interceptorsHeaders = {
    timestamp:
      Date.now() +
      (parseInt(window.localStorage.getItem("serverTime"), 10) || 0),
    onceStr: guid(),
    Authorization: config.headers.Authorization || getTokenInfo() || "",
  };
  const q = queryString.stringify({ ...config.params });
  const newUrl = isEmptyObj(config.params) ? url : url + "?" + q;
  const optData =
    typeof config.data === "string"
      ? parseData(config.data)
      : isEmptyObj(config.data)
      ? {}
      : config.data;
  const params = { url: newUrl, ...interceptorsHeaders, ...optData };
  const sortParam = jsonSort(params, config.method);
  const stringParam = JSON.stringify(sortParam);
  // console.log("加密前: ", stringParam);
  const safeHeaders = {
    signature: md5(stringParam),
  };

  const finalHeaders = {
    ...interceptorsHeaders,
    ...safeHeaders,
    ...config.headers,
  };

  if (isNoAuth) {
    delete finalHeaders.Authorization;
  }

  config.headers = finalHeaders;

  return config;
});

// 添加响应拦截器
ajax.interceptors.response.use(
  function (response) {
    const { status, data, config, headers } = response;
    const octetType = [
      "application/octet-stream",
      "application/vnd.openxmlformats",
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    ];
    if (
      (status === 200 &&
        ["blob", "arraybuffer"].includes(config.responseType)) ||
      octetType.includes(headers["content-type"])
    ) {
      return response;
    }

    // if (isTokenExpired(status) || isTokenExpired(data.code)) {

    // }
    return data;
  },
  function (error) {
    if (error.response) {
      console.log("接口报错了: ", error.response);

      const { status, data, config } = error.response;
      // if (isTokenExpired(status) || isTokenExpired(data.code)) {

      // }
      if (data && !["blob", "arraybuffer"].includes(config.responseType)) {
        return Promise.reject(data);
      }
      return Promise.reject(error.response);
    }

    return Promise.reject(error);
  }
);

const isTokenExpired = (status) => {
  return Number(status) === 401;
};

export default ajax;
