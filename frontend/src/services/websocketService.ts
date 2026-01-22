/**
 * WebSocket服务 - 处理实时进度更新
 *
 * 提供与后端WebSocket服务器的连接管理，支持：
 * - 自动连接和重连机制
 * - 任务进度订阅和取消订阅
 * - 实时进度更新回调处理
 * - 连接状态管理
 */

import { t } from "@/utils/i18n"

/**
 * 进度更新消息接口
 */
export interface ProgressUpdate {
  /** 消息类型 */
  type: "progress_update" | "status_update" | "completion" | "error"
  /** 任务ID */
  task_id: string
  /** 时间戳 */
  timestamp: string
  /** 消息数据 */
  data: {
    /** 进度百分比 (0-100) */
    progress?: number
    /** 任务状态 */
    status?: string
    /** 状态消息 */
    message?: string
    /** 当前步骤描述 */
    current_step?: string
    /** 预估剩余时间（秒） */
    estimated_remaining_time?: number
    /** 错误信息 */
    error?: string
    /** 错误代码 */
    error_code?: string
  }
}

/**
 * 进度更新回调函数类型
 */
export type ProgressCallback = (update: ProgressUpdate) => void

/**
 * WebSocket服务类
 *
 * 管理与后端的WebSocket连接，处理实时进度更新
 */
class WebSocketService {
  /** WebSocket连接实例 */
  private ws: WebSocket | null = null
  /** 任务订阅回调映射: task_id -> callback[] */
  private callbacks: Map<string, ProgressCallback[]> = new Map()
  /** 当前重连尝试次数 */
  private reconnectAttempts = 0
  /** 最大重连尝试次数 */
  private maxReconnectAttempts = 5
  /** 重连延迟时间（毫秒） */
  private reconnectDelay = 1000
  /** 是否正在连接中 */
  private isConnecting = false
  /** 连接状态变化监听器 */
  private connectionListeners: Array<(connected: boolean) => void> = []
  /** 重连定时器 */
  private reconnectTimer: NodeJS.Timeout | null = null

  /**
   * 连接到WebSocket服务器
   * @param taskId 任务ID，对应后端 simple_websocket 的 task 路径
   */
  connect(taskId: string): Promise<void> {
    return new Promise((resolve, reject) => {
      if (this.ws?.readyState === WebSocket.OPEN) {
        resolve()
        return
      }

      if (this.isConnecting) {
        // 如果正在连接，等待连接完成
        const checkConnection = () => {
          if (this.ws?.readyState === WebSocket.OPEN) {
            resolve()
          } else if (!this.isConnecting) {
            reject(new Error(t("api.error.network")))
          } else {
            setTimeout(checkConnection, 100)
          }
        }
        checkConnection()
        return
      }

      this.isConnecting = true

      // 获取WebSocket URL
      const protocol = window.location.protocol === "https:" ? "wss:" : "ws:"
      const host = window.location.hostname
      const port = import.meta.env.VITE_API_PORT || "8000"

      const wsUrl = `${protocol}//${host}:${port}/api/v1/simple-ws/task/${taskId}`

      try {
        this.ws = new WebSocket(wsUrl)

        this.ws.onopen = () => {
          console.log("WebSocket连接已建立")
          this.isConnecting = false
          this.reconnectAttempts = 0
          this.notifyConnectionChange(true)
          resolve()
        }

        this.ws.onmessage = (event) => {
          try {
            const update: ProgressUpdate = JSON.parse(event.data)
            this.handleProgressUpdate(update)
          } catch (error) {
            // 如果不是JSON格式，可能是测试消息或其他文本消息，直接忽略
            console.log("收到非JSON格式的WebSocket消息:", event.data)
          }
        }

        this.ws.onclose = (event) => {
          console.log("WebSocket连接已关闭:", event.code, event.reason)
          this.isConnecting = false
          this.ws = null
          this.notifyConnectionChange(false)

          // 清除之前的重连定时器
          if (this.reconnectTimer) {
            clearTimeout(this.reconnectTimer)
            this.reconnectTimer = null
          }

          // 自动重连（仅在非正常关闭时）
          if (
            event.code !== 1000 &&
            this.reconnectAttempts < this.maxReconnectAttempts
          ) {
            this.reconnectAttempts++
            const delay =
              this.reconnectDelay * 2 ** (this.reconnectAttempts - 1) // 指数退避
            console.log(
              `尝试重连 (${this.reconnectAttempts}/${this.maxReconnectAttempts})，${delay}ms后重试...`,
            )

            this.reconnectTimer = setTimeout(() => {
              this.connect(taskId).catch((error) => {
                console.error("重连失败:", error)
              })
            }, delay)
          } else if (this.reconnectAttempts >= this.maxReconnectAttempts) {
            console.error("已达到最大重连次数，停止重连")
          }
        }

        this.ws.onerror = (error) => {
          console.error("WebSocket错误:", error)
          this.isConnecting = false
          this.notifyConnectionChange(false)
          reject(error)
        }
      } catch (error) {
        this.isConnecting = false
        reject(error)
      }
    })
  }

  /**
   * 断开WebSocket连接
   */
  disconnect(): void {
    if (this.ws) {
      this.ws.close()
      this.ws = null
    }
    this.callbacks.clear()
  }

  /**
   * 订阅任务进度更新
   */
  subscribeToTask(taskId: string, callback: ProgressCallback): () => void {
    if (!this.callbacks.has(taskId)) {
      this.callbacks.set(taskId, [])
    }
    this.callbacks.get(taskId)!.push(callback)

    // 返回取消订阅函数
    return () => {
      const callbacks = this.callbacks.get(taskId)
      if (callbacks) {
        const index = callbacks.indexOf(callback)
        if (index > -1) {
          callbacks.splice(index, 1)
        }
        if (callbacks.length === 0) {
          this.callbacks.delete(taskId)
        }
      }
    }
  }

  /**
   * 处理进度更新
   */
  private handleProgressUpdate(update: ProgressUpdate): void {
    const callbacks = this.callbacks.get(update.task_id)
    if (callbacks) {
      callbacks.forEach((callback) => {
        try {
          callback(update)
        } catch (error) {
          console.error("执行进度回调失败:", error)
        }
      })
    }
  }

  /**
   * 获取连接状态
   */
  get isConnected(): boolean {
    return this.ws?.readyState === WebSocket.OPEN
  }

  /**
   * 添加连接状态监听器
   */
  addConnectionListener(listener: (connected: boolean) => void): () => void {
    this.connectionListeners.push(listener)
    // 立即调用一次，通知当前状态
    listener(this.isConnected)

    // 返回移除监听器的函数
    return () => {
      const index = this.connectionListeners.indexOf(listener)
      if (index > -1) {
        this.connectionListeners.splice(index, 1)
      }
    }
  }

  /**
   * 通知连接状态变化
   */
  private notifyConnectionChange(connected: boolean): void {
    this.connectionListeners.forEach((listener) => {
      try {
        listener(connected)
      } catch (error) {
        console.error("连接状态监听器执行失败:", error)
      }
    })
  }

  /**
   * 发送ping消息保持连接
   */
  ping(): void {
    if (this.isConnected) {
      this.ws?.send(JSON.stringify({ type: "ping" }))
    }
  }
}

export const websocketService = new WebSocketService()
