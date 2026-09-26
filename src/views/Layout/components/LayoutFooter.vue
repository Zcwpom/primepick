<script setup>

</script>
<template>
  <footer class="app_footer">
    <!-- 联系我们 -->
    <div class="contact">
      <div class="container">
        <dl>
          <dt>客户服务</dt>
          <dd><i class="iconfont icon-kefu"></i> 在线客服</dd>
          <dd><i class="iconfont icon-question"></i> 问题反馈</dd>
        </dl>
        <dl>
          <dt>关注我们</dt>
          <dd><i class="iconfont icon-weixin"></i> 公众号</dd>
          <dd><i class="iconfont icon-weibo"></i> 微博</dd>
        </dl>
        <dl>
          <dt>下载APP</dt>
          <dd class="qrcode"><img src="@/assets/images/qrcode.jpg" alt="优品购公众号二维码" /></dd>
          <dd class="download">
            <span>扫描二维码</span>
            <span>立马下载APP</span>
            <a>下载页面</a>
          </dd>
        </dl>
        <dl>
          <dt>服务热线</dt>
          <dd class="hotline">400-0000-000 <small>周一至周日 8:00-18:00</small></dd>
        </dl>
      </div>
    </div>
    <!-- 其它 -->
    <div class="extra">
      <div class="container">
        <div class="slogan">
          <a>
            <i class="iconfont icon-footer01"></i>
            <span>价格亲民</span>
          </a>
          <a>
            <i class="iconfont icon-footer02"></i>
            <span>物流快捷</span>
          </a>
          <a>
            <i class="iconfont icon-footer03"></i>
            <span>品质新鲜</span>
          </a>
        </div>
        <!-- 版权信息 -->
        <div class="copyright">
          <p>
            <a>关于我们</a>
            <a>帮助中心</a>
            <a>售后服务</a>
            <a>配送与验收</a>
            <a>商务合作</a>
            <a>搜索推荐</a>
            <a>友情链接</a>
          </p>
          <p>CopyRight © PrimePick</p>
        </div>
      </div>
    </div>
  </footer>
</template>

<style scoped lang='scss'>
.app_footer {
  overflow: hidden;
  background-color: #F0EDE8;
  padding-top: 20px;

  .contact {
    background: #fff;

    .container {
      padding: 50px 0 30px 25px;
      display: flex;
    }

    dl {
      height: 170px;
      text-align: center;
      padding: 0 72px;
      border-right: 1px solid #f2f2f2;
      color: #999;

      &:first-child {
        padding-left: 0;
      }

      &:last-child {
        border-right: none;
        padding-right: 0;
      }
    }

    dt {
      line-height: 1;
      font-size: 16px;
      color: #555;
      font-weight: 500;
      letter-spacing: 1px;
    }

    dd {
      margin: 30px 12px 0 0;
      float: left;
      width: 92px;
      height: 92px;
      padding-top: 10px;
      border: 1px solid #EDE9E4;

      .iconfont {
        font-size: 36px;
        display: block;
        color: #666;
      }

      &:hover {
        .iconfont {
          color: $xtxColor;
        }
      }

      &:last-child {
        margin-right: 0;
      }
    }

    .qrcode {
      width: 92px;
      height: 92px;
      padding: 7px;
      border: 1px solid #EDE9E4;
    }

    .download {
      padding-top: 5px;
      font-size: 14px;
      width: auto;
      height: auto;
      border: none;

      span {
        display: block;
      }

      a {
        display: block;
        line-height: 1;
        padding: 10px 25px;
        margin-top: 5px;
        color: #fff;
        border-radius: 2px;
        background-color: $xtxColor;
      }
    }

    .hotline {
      padding-top: 20px;
      font-size: 22px;
      color: #666;
      width: auto;
      height: auto;
      border: none;

      small {
        display: block;
        font-size: 15px;
        color: #999;
      }
    }
  }

  .extra {
    background-color: #1A1A1A;
  }

  .slogan {
    height: 150px;
    line-height: 50px;
    padding: 50px 100px;
    border-bottom: 1px solid #333;
    display: flex;
    justify-content: space-between;

    a {
      height: 50px;
      line-height: 50px;
      color: #E8E4DF;
      font-size: 22px;
      letter-spacing: 2px;

      i {
        font-size: 40px;
        vertical-align: middle;
        margin-right: 10px;
        font-weight: 100;
        color: $xtxColor;
      }

      span {
        vertical-align: middle;
      }
    }
  }

  .copyright {
    height: 140px;
    padding-top: 35px;
    text-align: center;
    color: #888;
    font-size: 14px;

    p {
      line-height: 1;
      margin-bottom: 18px;
      letter-spacing: 0.5px;
    }

    a {
      color: #888;
      line-height: 1;
      padding: 0 12px;
      border-right: 1px solid #555;

      &:last-child {
        border-right: none;
      }

      &:hover {
        color: $xtxColor;
      }
    }
  }
}
</style>
