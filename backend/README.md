# FastAPI Project - Backend

## Requirements

* [Docker](https://www.docker.com/).
* [uv](https://docs.astral.sh/uv/) for Python package and environment management.

## Docker Compose

Start the local development environment with Docker Compose following the guide in [../development.md](../development.md).

## General Workflow

By default, the dependencies are managed with [uv](https://docs.astral.sh/uv/), go there and install it.

From `./backend/` you can install all the dependencies with:

```console
$ uv sync
```

Then you can activate the virtual environment with:

```console
$ source .venv/bin/activate
```

Make sure your editor is using the correct Python virtual environment, with the interpreter at `backend/.venv/bin/python`.

Modify or add SQLModel models for data and SQL tables in `./backend/app/models.py`, API endpoints in `./backend/app/api/`, CRUD (Create, Read, Update, Delete) utils in `./backend/app/crud.py`.

## VS Code

There are already configurations in place to run the backend through the VS Code debugger, so that you can use breakpoints, pause and explore variables, etc.

The setup is also already configured so you can run the tests through the VS Code Python tests tab.

## Docker Compose Override

During development, you can change Docker Compose settings that will only affect the local development environment in the file `docker-compose.override.yml`.

The changes to that file only affect the local development environment, not the production environment. So, you can add "temporary" changes that help the development workflow.

For example, the directory with the backend code is synchronized in the Docker container, copying the code you change live to the directory inside the container. That allows you to test your changes right away, without having to build the Docker image again. It should only be done during development, for production, you should build the Docker image with a recent version of the backend code. But during development, it allows you to iterate very fast.

There is also a command override that runs `fastapi run --reload` instead of the default `fastapi run`. It starts a single server process (instead of multiple, as would be for production) and reloads the process whenever the code changes. Have in mind that if you have a syntax error and save the Python file, it will break and exit, and the container will stop. After that, you can restart the container by fixing the error and running again:

```console
$ docker compose watch
```

There is also a commented out `command` override, you can uncomment it and comment the default one. It makes the backend container run a process that does "nothing", but keeps the container alive. That allows you to get inside your running container and execute commands inside, for example a Python interpreter to test installed dependencies, or start the development server that reloads when it detects changes.

To get inside the container with a `bash` session you can start the stack with:

```console
$ docker compose watch
```

and then in another terminal, `exec` inside the running container:

```console
$ docker compose exec backend bash
```

You should see an output like:

```console
root@7f2607af31c3:/app#
```

that means that you are in a `bash` session inside your container, as a `root` user, under the `/app` directory, this directory has another directory called "app" inside, that's where your code lives inside the container: `/app/app`.

There you can use the `fastapi run --reload` command to run the debug live reloading server.

```console
$ fastapi run --reload app/main.py
```

...it will look like:

```console
root@7f2607af31c3:/app# fastapi run --reload app/main.py
```

and then hit enter. That runs the live reloading server that auto reloads when it detects code changes.

Nevertheless, if it doesn't detect a change but a syntax error, it will just stop with an error. But as the container is still alive and you are in a Bash session, you can quickly restart it after fixing the error, running the same command ("up arrow" and "Enter").

...this previous detail is what makes it useful to have the container alive doing nothing and then, in a Bash session, make it run the live reload server.

## Backend tests

To test the backend run:

```console
$ bash ./scripts/test.sh
```

The tests run with Pytest, modify and add tests to `./backend/app/tests/`.

If you use GitHub Actions the tests will run automatically.

### Test running stack

If your stack is already up and you just want to run the tests, you can use:

```bash
docker compose exec backend bash scripts/tests-start.sh
```

That `/app/scripts/tests-start.sh` script just calls `pytest` after making sure that the rest of the stack is running. If you need to pass extra arguments to `pytest`, you can pass them to that command and they will be forwarded.

For example, to stop on first error:

```bash
docker compose exec backend bash scripts/tests-start.sh -x
```

### Test Coverage

When the tests are run, a file `htmlcov/index.html` is generated, you can open it in your browser to see the coverage of the tests.

## Migrations

As during local development your app directory is mounted as a volume inside the container, you can also run the migrations with `alembic` commands inside the container and the migration code will be in your app directory (instead of being only inside the container). So you can add it to your git repository.

Make sure you create a "revision" of your models and that you "upgrade" your database with that revision every time you change them. As this is what will update the tables in your database. Otherwise, your application will have errors.

* Start an interactive session in the backend container:

```console
$ docker compose exec backend bash
```

* Alembic is already configured to import your SQLModel models from `./backend/app/models.py`.

* After changing a model (for example, adding a column), inside the container, create a revision, e.g.:

```console
$ alembic revision --autogenerate -m "Add column last_name to User model"
```

* Commit to the git repository the files generated in the alembic directory.

* After creating the revision, run the migration in the database (this is what will actually change the database):

```console
$ alembic upgrade head
```

If you don't want to use migrations at all, uncomment the lines in the file at `./backend/app/core/db.py` that end in:

```python
SQLModel.metadata.create_all(engine)
```

and comment the line in the file `scripts/prestart.sh` that contains:

```console
$ alembic upgrade head
```

If you don't want to start with the default models and want to remove them / modify them, from the beginning, without having any previous revision, you can remove the revision files (`.py` Python files) under `./backend/app/alembic/versions/`. And then create a first migration as described above.

## Email Templates

The email templates are in `./backend/app/email-templates/`. Here, there are two directories: `build` and `src`. The `src` directory contains the source files that are used to build the final email templates. The `build` directory contains the final email templates that are used by the application.

Before continuing, ensure you have the [MJML extension](https://marketplace.visualstudio.com/items?itemName=attilabuti.vscode-mjml) installed in your VS Code.

Once you have the MJML extension installed, you can create a new email template in the `src` directory. After creating the new email template and with the `.mjml` file open in your editor, open the command palette with `Ctrl+Shift+P` and search for `MJML: Export to HTML`. This will convert the `.mjml` file to a `.html` file and now you can save it in the build directory.





          
# FastAPI 项目 - 后端

## 要求

* [Docker](https://www.docker.com/)。
* [uv](https://docs.astral.sh/uv/) 用于 Python 包和环境管理。

## Docker Compose

按照 [../development.md](../development.md) 中的指南使用 Docker Compose 启动本地开发环境。

## 一般工作流程

默认情况下，依赖项由 [uv](https://docs.astral.sh/uv/) 管理，请前往该网站并安装它。

在 `./backend/` 目录中，你可以使用以下命令安装所有依赖项：

```console
$ uv sync
```

然后你可以使用以下命令激活虚拟环境：

```console
$ source .venv/bin/activate
```

确保你的编辑器使用正确的 Python 虚拟环境，解释器路径为 `backend/.venv/bin/python`。

在 `./backend/app/models.py` 中修改或添加用于数据和 SQL 表的 SQLModel 模型，在 `./backend/app/api/` 中修改 API 端点，在 `./backend/app/crud.py` 中修改 CRUD（创建、读取、更新、删除）工具。

## VS Code

已经有配置可以通过 VS Code 调试器运行后端，这样你就可以使用断点、暂停并探索变量等功能。

该设置也已经配置好，你可以通过 VS Code Python 测试选项卡运行测试。

## Docker Compose 覆盖

在开发过程中，你可以在 `docker-compose.override.yml` 文件中更改 Docker Compose 设置，这些设置只会影响本地开发环境。

对该文件的更改只影响本地开发环境，不影响生产环境。因此，你可以添加有助于开发工作流程的"临时"更改。

例如，后端代码目录在 Docker 容器中同步，将你更改的代码实时复制到容器内的目录中。这允许你立即测试你的更改，而无需再次构建 Docker 镜像。这应该只在开发过程中完成，对于生产环境，你应该使用最新版本的后端代码构建 Docker 镜像。但在开发过程中，它允许你非常快速地迭代。

还有一个命令覆盖，它运行 `fastapi run --reload` 而不是默认的 `fastapi run`。它启动单个服务器进程（而不是像生产环境那样的多个进程），并在代码更改时重新加载进程。请注意，如果你有语法错误并保存了 Python 文件，它将会中断并退出，容器将停止。之后，你可以通过修复错误并再次运行来重启容器：

```console
$ docker compose watch
```

还有一个被注释掉的 `command` 覆盖，你可以取消注释并注释掉默认的那个。它使后端容器运行一个"什么都不做"的进程，但保持容器活动。这允许你进入正在运行的容器并在其中执行命令，例如 Python 解释器来测试已安装的依赖项，或启动在检测到更改时重新加载的开发服务器。

要使用 `bash` 会话进入容器，你可以使用以下命令启动堆栈：

```console
$ docker compose watch
```

然后在另一个终端中，`exec` 进入正在运行的容器：

```console
$ docker compose exec backend bash
```

你应该会看到类似以下的输出：

```console
root@7f2607af31c3:/app#
```

这意味着你在容器内的 `bash` 会话中，作为 `root` 用户，在 `/app` 目录下，这个目录内有另一个名为 "app" 的目录，那是你的代码在容器内的位置：`/app/app`。

在那里你可以使用 `fastapi run --reload` 命令运行调试实时重载服务器。

```console
$ fastapi run --reload app/main.py
```

...它看起来会像：

```console
root@7f2607af31c3:/app# fastapi run --reload app/main.py
```

然后按回车键。这将运行实时重载服务器，当它检测到代码更改时会自动重新加载。

然而，如果它没有检测到更改而是检测到语法错误，它将会停止并显示错误。但由于容器仍然活动且你在 Bash 会话中，你可以在修复错误后快速重启它，运行相同的命令（"向上箭头"和"回车"）。

...这个之前的细节就是为什么让容器保持活动而不做任何事情，然后在 Bash 会话中让它运行实时重载服务器是有用的。

## 后端测试

要测试后端，请运行：

```console
$ bash ./scripts/test.sh
```

测试使用 Pytest 运行，在 `./backend/app/tests/` 中修改和添加测试。

如果你使用 GitHub Actions，测试将自动运行。

### 测试运行堆栈

如果你的堆栈已经启动，你只想运行测试，你可以使用：

```bash
docker compose exec backend bash scripts/tests-start.sh
```

那个 `/app/scripts/tests-start.sh` 脚本只是在确保堆栈的其余部分正在运行后调用 `pytest`。如果你需要向 `pytest` 传递额外的参数，你可以将它们传递给该命令，它们将被转发。

例如，在第一个错误处停止：

```bash
docker compose exec backend bash scripts/tests-start.sh -x
```

### 测试覆盖率

当测试运行时，会生成一个 `htmlcov/index.html` 文件，你可以在浏览器中打开它来查看测试的覆盖率。

## 迁移

由于在本地开发期间你的应用目录作为卷挂载在容器内，你也可以在容器内使用 `alembic` 命令运行迁移，迁移代码将在你的应用目录中（而不仅仅是在容器内）。所以你可以将它添加到你的 git 仓库中。

确保你创建了模型的"修订版"，并且每次更改模型时都用该修订版"升级"你的数据库。因为这将更新数据库中的表。否则，你的应用程序将出现错误。

* 在后端容器中启动交互式会话：

```console
$ docker compose exec backend bash
```

* Alembic 已经配置为从 `./backend/app/models.py` 导入你的 SQLModel 模型。

* 在更改模型后（例如，向 User 模型添加一列），在容器内创建一个修订版，例如：

```console
$ alembic revision --autogenerate -m "Add column last_name to User model"
```

* 将 alembic 目录中生成的文件提交到 git 仓库。

* 创建修订版后，在数据库中运行迁移（这将实际更改数据库）：

```console
$ alembic upgrade head
```

如果你根本不想使用迁移，请取消注释 `./backend/app/core/db.py` 文件中以下内容结尾的行：

```python
SQLModel.metadata.create_all(engine)
```

并注释掉 `scripts/prestart.sh` 文件中包含以下内容的行：

```console
$ alembic upgrade head
```

如果你不想从默认模型开始，想从一开始就删除/修改它们，而没有任何先前的修订版，你可以删除 `./backend/app/alembic/versions/` 下的修订版文件（`.py` Python 文件）。然后按照上述方法创建第一个迁移。

## 电子邮件模板

电子邮件模板位于 `./backend/app/email-templates/`。这里有两个目录：`build` 和 `src`。`src` 目录包含用于构建最终电子邮件模板的源文件。`build` 目录包含应用程序使用的最终电子邮件模板。

在继续之前，请确保你在 VS Code 中安装了 [MJML 扩展](https://marketplace.visualstudio.com/items?itemName=attilabuti.vscode-mjml)。

安装 MJML 扩展后，你可以在 `src` 目录中创建新的电子邮件模板。创建新的电子邮件模板并在编辑器中打开 `.mjml` 文件后，使用 `Ctrl+Shift+P` 打开命令面板并搜索 `MJML: Export to HTML`。这将把 `.mjml` 文件转换为 `.html` 文件，现在你可以将其保存在 build 目录中。
        