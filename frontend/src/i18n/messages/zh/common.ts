import type { I18nMessages } from "../../types"

export const commonMessages: Pick<
  I18nMessages,
  | "app"
  | "language"
  | "nav"
  | "userMenu"
  | "auth"
  | "common"
  | "updates"
  | "time"
  | "file"
  | "validation"
  | "errors"
  | "notFound"
  | "dashboard"
> = {
  app: {
    title: "ENVDAMA 智能环保数据分析平台",
    logoAlt: "ENVDAMA 标志",
  },
  language: {
    label: "语言",
    zh: "中文",
    en: "英文",
  },
  nav: {
    home: "首页",
    flowingFlow: "FlowingFlow",
    materialBalance: "物料平衡计算",
    asm1slim: "ASM1 Slim",
    asm1: "活性污泥模型 ASM1",
    asm3: "活性污泥模型 ASM3",
    hybrid: "Hybrid 配置",
    udmModels: "UDM 模型库",
    petersenTutorial: "Petersen 教程",
    knowledge: "知识库",
    superDashboard: "超级管理员看板",
    items: "项目",
    userManagement: "用户管理",
  },
  userMenu: {
    profile: "我的资料",
    logout: "退出登录",
    userFallback: "用户",
  },
  auth: {
    welcomeBack: "欢迎回到 ENVDAMA，登录您的智能环保数据分析平台。",
    signupIntro: "加入 ENVDAMA，开启您的智能环保数据分析之旅。",
    alreadyHaveAccount: "已有账户？",
    forgotPassword: "忘记密码？",
    loginNow: "立即登录",
    noAccount: "还没有账户？",
    signUpNow: "立即注册",
    emailPlaceholder: "邮箱",
    fullNamePlaceholder: "姓名",
    passwordPlaceholder: "密码",
    confirmPasswordPlaceholder: "确认密码",
    newPasswordPlaceholder: "新密码",
    recoverTitle: "找回密码",
    recoverDescription: "系统将发送密码找回邮件至已注册邮箱。",
    recoverSubmit: "继续",
    recoverSuccess: "密码找回邮件已发送。",
    resetTitle: "重置密码",
    resetDescription: "请输入新密码并确认以完成重置。",
    resetSubmit: "重置密码",
    resetSuccess: "密码已更新。",
  },
  common: {
    success: "成功",
    error: "错误",
    warning: "警告",
    info: "提示",
    loading: "加载中...",
    notAvailable: "暂无",
    id: "编号",
    title: "标题",
    description: "描述",
    role: "角色",
    status: "状态",
    actions: "操作",
    openMenu: "打开菜单",
    expandSidebar: "展开侧边栏",
    collapseSidebar: "收起侧边栏",
    you: "你",
    active: "活跃",
    inactive: "非活跃",
    cancel: "取消",
    confirm: "确认",
    delete: "删除",
    save: "保存",
    edit: "编辑",
    create: "创建",
    update: "更新",
    submit: "提交",
    reset: "重置",
    close: "关闭",
    retry: "重试",
    unknown: "未知",
    minute: "分钟",
    second: "秒",
  },
  updates: {
    empty: "暂无更新内容",
    backToList: "返回更新列表",
    viewMore: "查看更多更新",
    publishedAt: "发布于 {date}",
  },
  time: {
    relative: {
      justNow: "刚刚",
      minutesAgo: "{count}分钟前",
      hoursAgo: "{count}小时前",
      daysAgo: "{count}天前",
    },
    duration: {
      days: "{days}天 {hours}小时 {minutes}分钟",
      hours: "{hours}小时 {minutes}分钟",
      minutes: "{minutes}分钟 {seconds}秒",
      seconds: "{seconds}秒",
    },
  },
  file: {
    file: "文件",
    uploadSuccess: "文件上传成功",
    uploadFailed: "文件上传失败",
    uploading: "上传中...",
    deleteFile: "删除文件",
    invalidExtension: "不支持的文件扩展名",
    invalidMimeType: "不支持的文件类型",
    fileSizeExceeded: "文件大小超过限制",
    upload: {
      success: "文件上传成功",
      error: "文件上传失败",
      invalidType: "不支持的文件类型",
      sizeExceeded: "文件大小超过限制",
      empty: "文件不能为空",
      processing: "正在处理文件...",
    },
    download: {
      success: "文件下载成功",
      error: "文件下载失败",
      noResult: "该任务暂无可下载的结果",
    },
    validation: {
      unsupportedExtension: "不支持的文件扩展名",
      unsupportedMimeType: "不支持的文件类型",
      sizeExceeded: "文件大小超过限制",
      supportedFormats: "支持的格式: {formats}",
      sizeExceededDetail: "当前: {current}MB，最大: {max}MB",
    },
  },
  validation: {
    required: "此字段为必填项",
    email: "请输入有效的邮箱地址",
    name: "姓名格式不正确",
    password: "密码格式不正确",
    minLength: "长度不能少于{min}个字符",
    maxLength: "长度不能超过{max}个字符",
    numeric: "请输入有效的数字",
    passwordMismatch: "两次输入的密码不一致",
    confirmPasswordRequired: "请确认密码",
  },
  errors: {
    somethingWentWrong: "出了点问题。",
    validationError: "校验错误",
    validationErrors: "校验错误：",
    operationFailed: "操作失败",
    unexpected: "发生未知错误",
  },
  notFound: {
    title: "哎呀！",
    description: "未找到你访问的页面。",
    back: "返回",
  },
  dashboard: {
    greeting: "你好，{name}",
    welcomeBack: "欢迎回来，很高兴再次和您相遇！",
    placeholder: "你好 /dashboard！",
  },
}
