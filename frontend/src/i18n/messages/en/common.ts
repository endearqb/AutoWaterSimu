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
    title: "ENVDAMA Intelligent Environmental Data Platform",
    logoAlt: "ENVDAMA Logo",
  },
  language: {
    label: "Language",
    zh: "中文",
    en: "English",
  },
  nav: {
    home: "Home",
    flowingFlow: "FlowingFlow",
    materialBalance: "Material Balance",
    asm1slim: "ASM1 Slim",
    asm1: "ASM1",
    asm3: "ASM3",
    hybrid: "Hybrid Config",
    udmModels: "UDM Models",
    petersenTutorial: "Petersen Tutorial",
    knowledge: "Knowledge",
    superDashboard: "Super Dashboard",
    items: "Items",
    userManagement: "User Management",
  },
  userMenu: {
    profile: "My Profile",
    logout: "Log Out",
    userFallback: "User",
  },
  auth: {
    welcomeBack:
      "Welcome back to ENVDAMA. Sign in to your smart environmental analytics platform.",
    signupIntro:
      "Join ENVDAMA and start your intelligent environmental analytics journey.",
    alreadyHaveAccount: "Already have an account?",
    forgotPassword: "Forgot password?",
    loginNow: "Log In",
    noAccount: "Don't have an account?",
    signUpNow: "Sign Up",
    emailPlaceholder: "Email",
    fullNamePlaceholder: "Full Name",
    passwordPlaceholder: "Password",
    confirmPasswordPlaceholder: "Confirm Password",
    newPasswordPlaceholder: "New Password",
    recoverTitle: "Password Recovery",
    recoverDescription:
      "A password recovery email will be sent to the registered account.",
    recoverSubmit: "Continue",
    recoverSuccess: "Password recovery email sent successfully.",
    resetTitle: "Reset Password",
    resetDescription:
      "Please enter your new password and confirm it to reset your password.",
    resetSubmit: "Reset Password",
    resetSuccess: "Password updated successfully.",
  },
  common: {
    success: "Success",
    error: "Error",
    warning: "Warning",
    info: "Info",
    loading: "Loading...",
    notAvailable: "N/A",
    id: "ID",
    title: "Title",
    description: "Description",
    role: "Role",
    status: "Status",
    actions: "Actions",
    openMenu: "Open menu",
    expandSidebar: "Expand sidebar",
    collapseSidebar: "Collapse sidebar",
    you: "You",
    active: "Active",
    inactive: "Inactive",
    cancel: "Cancel",
    confirm: "Confirm",
    delete: "Delete",
    save: "Save",
    edit: "Edit",
    create: "Create",
    update: "Update",
    submit: "Submit",
    reset: "Reset",
    close: "Close",
    retry: "Retry",
    unknown: "Unknown",
    minute: "min",
    second: "s",
  },
  updates: {
    empty: "No updates yet",
    backToList: "Back to updates",
    viewMore: "More updates",
    publishedAt: "Published on {date}",
  },
  time: {
    relative: {
      justNow: "Just now",
      minutesAgo: "{count} min ago",
      hoursAgo: "{count} hr ago",
      daysAgo: "{count} days ago",
    },
    duration: {
      days: "{days}d {hours}h {minutes}m",
      hours: "{hours}h {minutes}m",
      minutes: "{minutes}m {seconds}s",
      seconds: "{seconds}s",
    },
  },
  file: {
    file: "File",
    uploadSuccess: "File uploaded successfully",
    uploadFailed: "File upload failed",
    uploading: "Uploading...",
    deleteFile: "Delete file",
    invalidExtension: "Unsupported file extension",
    invalidMimeType: "Unsupported file type",
    fileSizeExceeded: "File size exceeds limit",
    upload: {
      success: "File uploaded successfully",
      error: "File upload failed",
      invalidType: "Unsupported file type",
      sizeExceeded: "File size exceeds limit",
      empty: "File cannot be empty",
      processing: "Processing file...",
    },
    download: {
      success: "File downloaded successfully",
      error: "File download failed",
      noResult: "No downloadable results for this task",
    },
    validation: {
      unsupportedExtension: "Unsupported file extension",
      unsupportedMimeType: "Unsupported file type",
      sizeExceeded: "File size exceeds limit",
      supportedFormats: "Supported formats: {formats}",
      sizeExceededDetail: "Current: {current}MB, Max: {max}MB",
    },
  },
  validation: {
    required: "This field is required",
    email: "Please enter a valid email address",
    name: "Invalid name",
    password: "Invalid password format",
    minLength: "Must be at least {min} characters",
    maxLength: "Must not exceed {max} characters",
    numeric: "Please enter a valid number",
    passwordMismatch: "The passwords do not match",
    confirmPasswordRequired: "Password confirmation is required",
  },
  errors: {
    somethingWentWrong: "Something went wrong.",
    validationError: "Validation error",
    validationErrors: "Validation errors:",
    operationFailed: "Operation failed",
    unexpected: "An unexpected error occurred",
  },
  notFound: {
    title: "Oops!",
    description: "The page you are looking for was not found.",
    back: "Go Back",
  },
  dashboard: {
    greeting: "Hi, {name}",
    welcomeBack: "Welcome back, nice to see you again!",
    placeholder: "Hello /dashboard!",
  },
}
