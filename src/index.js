const fs = require('fs');
const path = require('path');

export default (api, opts) => {
  if (process.env.NODE_ENV !== 'production') {
    return false;
  }

  api.log.success('insert pro magic code');
  const gaTpl = function(serverUrl) {
    return `
    var __assign = (this && this.__assign) || function () {
      __assign = Object.assign || function(t) {
          for (var s, i = 1, n = arguments.length; i < n; i++) {
              s = arguments[i];
              for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p))
                  t[p] = s[p];
          }
          return t;
      };
      return __assign.apply(this, arguments);
  };
  var prevFetch = window.fetch;
  var enableAudit = false;
  var apiDomain = "${serverUrl}";
  function urlHasOwnProtocol(url) {
      return url.startsWith('http://') || url.startsWith('https://') || url.startsWith('//');
  }
  var isStaticAsset = function (url) {
      return /\.html\??\S*/g.test(url) || /\.js\??\S*/g.test(url) || /\.css\??\S*/g.test(url);
  };
  function getEntireUrl(url, apiDomain) {
      return !urlHasOwnProtocol(url) ? apiDomain + (url.startsWith('/') ? url : "/" + url) : url;
  }
  /*
         只处理本身 url 不带协议的请求
          1. 当开启操作审计时，除静态资源请求外所有接口直接走当前域，同时带上相应的头信息
          2. 当未开启操作审计时，请求转换为跨域请求调用
         */
  window.fetch = function (url, options) {
      if (options === void 0) { options = {}; }
      if (!urlHasOwnProtocol(url)) {
          if (enableAudit && !isStaticAsset(url)) {
              // 开启操作审计时带上相应头信息
              var auditOptions = __assign({}, options, { headers: __assign({}, options.headers) });
              return prevFetch.call(window, url, auditOptions);
          }
          // 未开启操作审计请求以跨域方式发出
          var corsOptions = __assign({}, options,{credentials: 'omit'});
          // 发起跨域请求
          var entireUrl = getEntireUrl(url, apiDomain);
          return prevFetch.call(window, entireUrl, corsOptions);
      }
      return prevFetch.call(window, url, options);
  };
  
  `;
  };
  api.addHTMLScript({
    content: gaTpl(opts.serverUrl),
  });
  api.onBuildSuccess(() => {
    // 创建一个 404 文件，因为 github pages 不支持单应用模式
    const { absOutputPath } = api.paths;
    fs.copyFileSync(path.join(absOutputPath, 'index.html'), path.join(absOutputPath, '404.html'));
    api.log.success('create 404.html');
  });
};
