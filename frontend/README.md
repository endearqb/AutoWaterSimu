# FastAPI Project - Frontend

The frontend is built with [Vite](https://vitejs.dev/), [React](https://reactjs.org/), [TypeScript](https://www.typescriptlang.org/), [TanStack Query](https://tanstack.com/query), [TanStack Router](https://tanstack.com/router) and [Chakra UI](https://chakra-ui.com/).

## Frontend development

Before you begin, ensure that you have either the Node Version Manager (nvm) or Fast Node Manager (fnm) installed on your system.

* To install fnm follow the [official fnm guide](https://github.com/Schniz/fnm#installation). If you prefer nvm, you can install it using the [official nvm guide](https://github.com/nvm-sh/nvm#installing-and-updating).

* After installing either nvm or fnm, proceed to the `frontend` directory:

```bash
cd frontend
```
* If the Node.js version specified in the `.nvmrc` file isn't installed on your system, you can install it using the appropriate command:

```bash
# If using fnm
fnm install

# If using nvm
nvm install
```

* Once the installation is complete, switch to the installed version:

```bash
# If using fnm
fnm use

# If using nvm
nvm use
```

* Within the `frontend` directory, install the necessary NPM packages:

```bash
npm install
```

* And start the live server with the following `npm` script:

```bash
npm run dev
```

* Then open your browser at http://localhost:5173/.

Notice that this live server is not running inside Docker, it's for local development, and that is the recommended workflow. Once you are happy with your frontend, you can build the frontend Docker image and start it, to test it in a production-like environment. But building the image at every change will not be as productive as running the local development server with live reload.

Check the file `package.json` to see other available options.

### Removing the frontend

If you are developing an API-only app and want to remove the frontend, you can do it easily:

* Remove the `./frontend` directory.

* In the `docker-compose.yml` file, remove the whole service / section `frontend`.

* In the `docker-compose.override.yml` file, remove the whole service / section `frontend` and `playwright`.

Done, you have a frontend-less (api-only) app. 🤓

---

If you want, you can also remove the `FRONTEND` environment variables from:

* `.env`
* `./scripts/*.sh`

But it would be only to clean them up, leaving them won't really have any effect either way.

## Generate Client

### Automatically

* Activate the backend virtual environment.
* From the top level project directory, run the script:

```bash
./scripts/generate-client.sh
```

* Commit the changes.

### Manually

* Start the Docker Compose stack.

* Download the OpenAPI JSON file from `http://localhost/api/v1/openapi.json` and copy it to a new file `openapi.json` at the root of the `frontend` directory.

* To generate the frontend client, run:

```bash
npm run generate-client
```

* Commit the changes.

Notice that everytime the backend changes (changing the OpenAPI schema), you should follow these steps again to update the frontend client.

## Using a Remote API

If you want to use a remote API, you can set the environment variable `VITE_API_URL` to the URL of the remote API. For example, you can set it in the `frontend/.env` file:

```env
VITE_API_URL=https://api.my-domain.example.com
```

Then, when you run the frontend, it will use that URL as the base URL for the API.

## Code Structure

The frontend code is structured as follows:

* `frontend/src` - The main frontend code.
* `frontend/src/assets` - Static assets.
* `frontend/src/client` - The generated OpenAPI client.
* `frontend/src/components` -  The different components of the frontend.
* `frontend/src/hooks` - Custom hooks.
* `frontend/src/routes` - The different routes of the frontend which include the pages.
* `theme.tsx` - The Chakra UI custom theme.

## End-to-End Testing with Playwright

The frontend includes initial end-to-end tests using Playwright. To run the tests, you need to have the Docker Compose stack running. Start the stack with the following command:

```bash
docker compose up -d --wait backend
```

Then, you can run the tests with the following command:

```bash
npx playwright test
```

You can also run your tests in UI mode to see the browser and interact with it running:

```bash
npx playwright test --ui
```

To stop and remove the Docker Compose stack and clean the data created in tests, use the following command:

```bash
docker compose down -v
```

To update the tests, navigate to the tests directory and modify the existing test files or add new ones as needed.

For more information on writing and running Playwright tests, refer to the official [Playwright documentation](https://playwright.dev/docs/intro).




          
# FastAPI 项目 - 前端

前端使用 [Vite](https://vitejs.dev/)、[React](https://reactjs.org/)、[TypeScript](https://www.typescriptlang.org/)、[TanStack Query](https://tanstack.com/query)、[TanStack Router](https://tanstack.com/router) 和 [Chakra UI](https://chakra-ui.com/) 构建。

## 前端开发

开始之前，请确保你的系统上已安装 Node 版本管理器 (nvm) 或快速 Node 管理器 (fnm)。

* 要安装 fnm，请遵循 [官方 fnm 指南](https://github.com/Schniz/fnm#installation)。如果你更喜欢 nvm，可以使用 [官方 nvm 指南](https://github.com/nvm-sh/nvm#installing-and-updating) 进行安装。

* 安装 nvm 或 fnm 后，进入 `frontend` 目录：

```bash
cd frontend
```

* 如果 `.nvmrc` 文件中指定的 Node.js 版本尚未安装在你的系统上，你可以使用适当的命令安装它：

```bash
# 如果使用 fnm
fnm install

# 如果使用 nvm
nvm install
```

* 安装完成后，切换到已安装的版本：

```bash
# 如果使用 fnm
fnm use

# 如果使用 nvm
nvm use
```

* 在 `frontend` 目录中，安装必要的 NPM 包：

```bash
npm install
```

* 然后使用以下 `npm` 脚本启动实时服务器：

```bash
npm run dev
```

* 然后在浏览器中打开 http://localhost:5173/。

请注意，这个实时服务器不在 Docker 内运行，它用于本地开发，这是推荐的工作流程。一旦你对前端满意，你可以构建前端 Docker 镜像并启动它，以在生产类似的环境中测试它。但每次更改都构建镜像不会像运行具有实时重载的本地开发服务器那样高效。

查看 `package.json` 文件以了解其他可用选项。

### 移除前端

如果你正在开发仅 API 的应用程序并希望移除前端，你可以轻松完成：

* 移除 `./frontend` 目录。

* 在 `docker-compose.yml` 文件中，移除整个服务/部分 `frontend`。

* 在 `docker-compose.override.yml` 文件中，移除整个服务/部分 `frontend` 和 `playwright`。

完成，你现在有了一个无前端（仅 API）的应用程序。🤓

---

如果你愿意，你还可以从以下位置移除 `FRONTEND` 环境变量：

* `.env`
* `./scripts/*.sh`

但这只是为了清理它们，保留它们也不会有任何实际影响。

## 生成客户端

### 自动方式

* 激活后端虚拟环境。
* 从顶级项目目录运行脚本：

```bash
./scripts/generate-client.sh
```

* 提交更改。

### 手动方式

* 启动 Docker Compose 栈。

* 从 `http://localhost/api/v1/openapi.json` 下载 OpenAPI JSON 文件，并将其复制为 `frontend` 目录根目录中的新文件 `openapi.json`。

* 要生成前端客户端，请运行：

```bash
npm run generate-client
```

* 提交更改。

请注意，每次后端更改（更改 OpenAPI 架构）时，你都应该再次遵循这些步骤以更新前端客户端。

## 使用远程 API

如果你想使用远程 API，可以将环境变量 `VITE_API_URL` 设置为远程 API 的 URL。例如，你可以在 `frontend/.env` 文件中设置它：

```env
VITE_API_URL=https://api.my-domain.example.com
```

然后，当你运行前端时，它将使用该 URL 作为 API 的基础 URL。

## 代码结构

前端代码结构如下：

* `frontend/src` - 主要前端代码。
* `frontend/src/assets` - 静态资源。
* `frontend/src/client` - 生成的 OpenAPI 客户端。
* `frontend/src/components` - 前端的不同组件。
* `frontend/src/hooks` - 自定义 hooks。
* `frontend/src/routes` - 前端的不同路由，包括页面。
* `theme.tsx` - Chakra UI 自定义主题。

## 使用 Playwright 进行端到端测试

前端包括使用 Playwright 的初始端到端测试。要运行测试，你需要运行 Docker Compose 栈。使用以下命令启动栈：

```bash
docker compose up -d --wait backend
```

然后，你可以使用以下命令运行测试：

```bash
npx playwright test
```

你还可以在 UI 模式下运行测试，以查看浏览器并与之交互：

```bash
px playwright test --ui
```

要停止并移除 Docker Compose 栈并清理测试中创建的数据，请使用以下命令：

```bash
docker compose down -v
```

要更新测试，请导航到测试目录并根据需要修改现有测试文件或添加新文件。

有关编写和运行 Playwright 测试的更多信息，请参阅官方 [Playwright 文档](https://playwright.dev/docs/intro)。
        