const path = require("path");
let cp = require("child_process");
let fs = require("fs/promises");

function normalisePackageNames(n) {
  return n
    .replace(/@/g, "__AT__")
    .replace(/\//g, "__s__")
    .replace(/\./g, "__DOT__")
    .replace(/#/g, "__HASH__")
    .replace(/:/g, "__COLON__");
}

const Tools = {
  buildEnvSh: `${__dirname}/scripts/build-env.sh`,
  prepareBuildSh: `${__dirname}/scripts/prepare-build.sh`,
  installArtifactsSh: `${__dirname}/scripts/install-artifacts.sh`,
};

const Package = {
  nameOfLockEntry: (entry) => {
    let parts = entry.split("@");
    if (parts[0] !== "") {
      return parts[0];
    } else {
      return "@" + parts[1];
    }
  },
};

const Compile = {
  rule: ({ target, deps, buildCommands }) =>
    `${target}: ${deps.join(" ")}\n\t${buildCommands
      .map((command) => command.join(" "))
      .join("; ")}`,
};

const Env = {
  render(env, { localStore, store, globalStorePrefix, sources, project }) {
    return Object.keys(env).reduce((acc, key) => {
      acc[key] = renderEsyVariables(env[key], {
        localStore,
        store,
        globalStorePrefix,
        sources,
        project,
      });
      return acc;
    }, {});
  },
  toString(env) {
    return Object.keys(env)
      .filter((key) => key !== "SHELL") // TODO remove this
      .map((key) => {
        let v = env[key];
        if (v.indexOf(" ") !== -1) {
          v = `"${v}"`;
        }
        return `${key}=${v}`;
      })
      .join(" ");
  },
};

const esyBuildPlanCache = new Map();
function esyBuildPlan(esyBootInstallerSrcPath, cwd, packageName) {
  if (packageName === "setup-esy-installer") {
    return JSON.parse(` {
  "id": "setup_esy_installer-fb3bf850",
  "name": "setup-esy-installer",
  "version": "github:ManasJayanth/esy-boot-installer#beee8a4775846651c958946ec1d6919e54bd49bc",
  "sourceType": "immutable",
  "buildType": "in-source",
  "build": [
    [
      "make", "PREFIX=%{store}%/s/setup_esy_installer-fb3bf850",
      "esy-installer"
    ]
  ],
  "install": [
    [ "make", "PREFIX=%{store}%/s/setup_esy_installer-fb3bf850", "install" ]
  ],
  "sourcePath": "${esyBootInstallerSrcPath}",
  "rootPath": "%{globalStorePrefix}%/3/b/setup_esy_installer-fb3bf850",
  "buildPath": "%{globalStorePrefix}%/3/b/setup_esy_installer-fb3bf850",
  "stagePath": "%{store}%/s/setup_esy_installer-fb3bf850",
  "installPath": "%{store}%/i/setup_esy_installer-fb3bf850",
  "env": {
    "cur__version": "github:ManasJayanth/esy-boot-installer#beee8a4775846651c958946ec1d6919e54bd49bc",
    "cur__toplevel": "%{store}%/s/setup_esy_installer-fb3bf850/toplevel",
    "cur__target_dir": "%{globalStorePrefix}%/3/b/setup_esy_installer-fb3bf850",
    "cur__stublibs": "%{store}%/s/setup_esy_installer-fb3bf850/stublibs",
    "cur__share": "%{store}%/s/setup_esy_installer-fb3bf850/share",
    "cur__sbin": "%{store}%/s/setup_esy_installer-fb3bf850/sbin",
    "cur__root": "%{globalStorePrefix}%/3/b/setup_esy_installer-fb3bf850",
    "cur__original_root": "${esyBootInstallerSrcPath}",
    "cur__name": "setup-esy-installer",
    "cur__man": "%{store}%/s/setup_esy_installer-fb3bf850/man",
    "cur__lib": "%{store}%/s/setup_esy_installer-fb3bf850/lib",
    "cur__jobs": "4",
    "cur__install": "%{store}%/s/setup_esy_installer-fb3bf850",
    "cur__etc": "%{store}%/s/setup_esy_installer-fb3bf850/etc",
    "cur__doc": "%{store}%/s/setup_esy_installer-fb3bf850/doc",
    "cur__dev": "false",
    "cur__bin": "%{store}%/s/setup_esy_installer-fb3bf850/bin",
    "SHELL": "env -i /bin/bash --norc --noprofile",
    "PATH": "%{store}%/i/ocaml-4.12.0-3a04ec8f/bin::/usr/local/bin:/usr/bin:/bin:/usr/sbin:/sbin",
    "OCAML_TOPLEVEL_PATH": "%{store}%/i/ocaml-4.12.0-3a04ec8f/lib/ocaml",
    "OCAMLPATH": "%{store}%/i/ocaml-4.12.0-3a04ec8f/lib:",
    "OCAMLLIB": "%{store}%/i/ocaml-4.12.0-3a04ec8f/lib/ocaml",
    "OCAMLFIND_LDCONF": "ignore",
    "OCAMLFIND_DESTDIR": "%{store}%/s/setup_esy_installer-fb3bf850/lib",
    "MAN_PATH": "%{store}%/i/ocaml-4.12.0-3a04ec8f/man:",
    "CAML_LD_LIBRARY_PATH": "%{store}%/i/ocaml-4.12.0-3a04ec8f/lib/ocaml/stublibs:%{store}%/i/ocaml-4.12.0-3a04ec8f/lib/ocaml:"
  },
  "jbuilderHackEnabled": false,
  "depspec": "dependencies(self)"
}`);
  }

  let cmd = "esy build-plan";
  if (packageName) {
    let cachedResults = esyBuildPlanCache.get(packageName);
    if (cachedResults) {
      return cachedResults;
    }
    cmd = `${cmd} -p ${packageName}`;
  }
  let result = JSON.parse(cp.execSync(cmd).toString("utf-8"));
  if (packageName) {
    esyBuildPlanCache.set(packageName, result);
  }
  return result;
}

function renderEsyVariables(
  str,
  { localStore, store, globalStorePrefix, sources, project }
) {
  return str
    .replace(/%{globalStorePrefix}%/g, globalStorePrefix)
    .replace(/%{localStore}%/g, localStore)
    .replace(/%{store}%/g, store)
    .replace(/%{project}%/g, project)
    .replace("/store/s", "/store/i"); //HACK remove and start using rewritePrefix;
}

async function traverse(
  makeFile,
  curInstallMap,
  { localStore, store, globalStorePrefix, sources, project },
  lockFile,
  packageID,
  cwd,
  esyBootInstallerSrcPath
) {
  let dependencies;
  if (packageID === "setup-esy-installer@vvv@hhh") {
    dependencies = Object.keys(lockFile.node).filter((k) =>
      k.startsWith("ocaml@")
    );
  } else {
    dependencies =
      (lockFile.node[packageID] && lockFile.node[packageID].dependencies) ||
      throwError(`Package name not found: ${packageID}`);
  }
  let packageName = Package.nameOfLockEntry(packageID);
  if (makeFile.get(packageName)) {
    return makeFile;
  } else {
    let buildPlan = esyBuildPlan(esyBootInstallerSrcPath, cwd, packageName);
    let renderedEnv = Env.render(buildPlan.env, {
      localStore,
      store,
      globalStorePrefix,
      sources,
      project,
    });
    let buildsInSource =
      buildPlan.buildType == "in-source" || buildPlan.buildPlan == "_build";
    let curRoot = renderedEnv["cur__root"].replace(
      path.join(process.env["HOME"], ".esy", "source", "i"),
      sources
    );
    let curOriginalRoot = renderedEnv["cur__original_root"].replace(
      path.join(process.env["HOME"], ".esy", "source", "i"),
      sources
    );
    let curToplevel = renderedEnv["cur__toplevel"];
    let curInstall = renderedEnv["cur__install"];
    let curInstallImmutable = curInstall.replace("/s/", "/i/");
    renderedEnv["cur__install"] = curInstallImmutable;
    curInstall = curInstallImmutable; // HACKY but useful
    let curTargetDir = renderedEnv["cur__target_dir"];
    let curStublibs = renderedEnv["cur__stublibs"];
    let curShare = renderedEnv["cur__share"];
    let curSbin = renderedEnv["cur__sbin"];
    let curMan = renderedEnv["cur__man"];
    let curLib = renderedEnv["cur__lib"];
    let curEtc = renderedEnv["cur__etc"];
    let curDoc = renderedEnv["cur__doc"];
    let curBin = renderedEnv["cur__bin"];
    let envFile = `${curTargetDir}.env`;
    let pathFile = `${curTargetDir}.path`;

    let renderedEnvStr = Env.toString(renderedEnv);
    await fs.writeFile(envFile, renderedEnvStr);
    await fs.writeFile(pathFile, renderedEnv["PATH"]);
    curInstallMap.set(packageName, curInstallImmutable);

    let buildCommands = buildPlan.build
      .map((arg) =>
        arg.map((cmd) =>
          renderEsyVariables(cmd, {
            localStore,
            store,
            globalStorePrefix,
            sources,
            project,
          })
        )
      )
      .map((args) => {
        return [
          Tools.buildEnvSh,
          envFile,
          pathFile,
          `"${args.map((c) => "'" + c.replace(/'/g, "") + "'").join(" ")}"`,
        ];
      });
    buildCommands = [["cd", curRoot]].concat(buildCommands);
    if (buildsInSource) {
      buildCommands = [
        ["rm", "-rf", curRoot],
        ["cp", "-R", `${curOriginalRoot}`, curRoot],
      ].concat(buildCommands);
    } else {
      buildCommands = [
        ["rm", "-rf", curTargetDir],
        ["mkdir", "-p", curTargetDir],
      ].concat(buildCommands);
    }
    buildCommands = [["bash", Tools.prepareBuildSh, curInstall]]
      .concat(buildCommands)
      .concat(
        buildPlan.install && buildPlan.install.length !== 0
          ? buildPlan.install
              .map((arg) =>
                arg.map((cmd) =>
                  renderEsyVariables(cmd, {
                    localStore,
                    store,
                    globalStorePrefix,
                    sources,
                    project,
                  })
                )
              )
              .map((args) => {
                return [
                  Tools.buildEnvSh,
                  envFile,
                  pathFile,
                  `"${args
                    .map((c) => "'" + c.replace(/'/g, "") + "'")
                    .join(" ")}"`,
                ];
              })
          : [
              [
                "bash",
                Tools.installArtifactsSh,
                envFile,
                pathFile,
                path.join(
                  cwd,
                  "_boot/store/i/setup_esy_installer-fb3bf850/bin/esy-installer"
                ), // TODO replace this hardcoded path
                curInstallImmutable,
                packageName,
              ],
            ]
      );
    // A trick to make sure setup-esy-installer is run before everything else, including Dune
    if (packageName === "@opam/dune" || packageName === "@opam/ocamlbuild") {
      dependencies.push("setup-esy-installer@vvv@hhh");
    }
    for (let dep of dependencies) {
      makeFile = await traverse(
        makeFile,
        curInstallMap,
        { localStore, store, globalStorePrefix, sources, project },
        lockFile,
        dep,
        cwd,
        esyBootInstallerSrcPath
      );
    }

    let deps = dependencies.map(Package.nameOfLockEntry);

    makeFile.set(curInstallImmutable, {
      target: curInstallImmutable,
      deps,
      buildCommands,
    });

    makeFile.set(packageName, {
      target: packageName,
      deps: [curInstallImmutable],
      buildCommands: [],
    });

    return makeFile;
  }
}

async function emitBuild(
  cwd,
  localStore,
  store,
  globalStorePrefix,
  sources,
  esyBootInstallerSrcPath
) {
  const project = cwd;
  const rootProjectBuildPlan = esyBuildPlan(esyBootInstallerSrcPath, cwd);
  const lockFile = require(path.join(cwd, "esy.lock", "index.json"));
  /* type rule = { target, deps, build } */
  const makeFile /* Map<string, rule> */ = new Map();
  return Array.from(
    (
      await traverse(
        makeFile,
        new Map(),
        { localStore, store, globalStorePrefix, sources, project },
        lockFile,
        lockFile.root,
        cwd,
        esyBootInstallerSrcPath
      )
    ).values()
  )

    .map(Compile.rule)
    .join("\n\n");
}

async function compileMakefile({
  fileName,
  localStore,
  store,
  globalStorePrefix,
  sources,
  esyBootInstallerSrcPath,
}) {
  let makeFile = await emitBuild(
    process.cwd(),
    localStore,
    store,
    globalStorePrefix,
    sources,
    esyBootInstallerSrcPath
  );
  if (fileName) {
    log(`Writing to file: ${fileName}`);
    await fs.writeFile(fileName, makeFile);
  } else {
    console.log(makeFile);
  }
}

function visit(cur) {
  if (lockFile.node[cur].source.type === "install") {
    let source = lockFile.node[cur].source.source[0];
    if (source !== "no-source:" && !!source) {
      sources[cur] = source;
    }
  }
}

function log(...args) {
  console.log(...args);
}

async function setupPaths(cwd) {
  const tarballs = path.join(cwd, "_boot", "tarballs");
  const sources = path.join(cwd, "_boot", "sources");
  let esyBootInstallerSrcPath = path.join(sources, "esy-boot-installer");
  await fs.mkdir(sources, { recursive: true });
  const localStore = path.join(cwd, "_boot", "store");
  await fs.mkdir(localStore, { recursive: true });
  const store = path.join(cwd, "_boot", "store");
  await fs.mkdir(store, { recursive: true });
  const globalStorePrefix = path.join(cwd, "_boot", "store");
  await fs.mkdir(globalStorePrefix, { recursive: true });
  await fs.mkdir(path.join(globalStorePrefix, "b"), { recursive: true });
  await fs.mkdir(path.join(globalStorePrefix, "3", "b"), { recursive: true });

  return {
    sources,
    tarballs,
    localStore,
    store,
    globalStorePrefix,
    esyBootInstallerSrcPath,
  };
}

async function exists(path) {
  try {
    await fs.access(path);
    return true;
  } catch {
    return false;
  }
}
async function fetchSources({ tarballs, sources, esyBootInstallerSrcPath }) {
  let cmd = `sh ${__dirname}/scripts/fetch-sources.sh --sources-cache=${sources} --tarballs=${tarballs}`;
  log(`Fetching source tarballs with '${cmd}'`);
  cp.execSync(cmd);
  if (!(await exists(esyBootInstallerSrcPath))) {
    let esyBootInstallerGithubUrl =
      "git@github.com:ManasJayanth/esy-boot-installer.git";
    cmd = `git clone ${esyBootInstallerGithubUrl} ${esyBootInstallerSrcPath}`;
    log(`Cloning esy-boot-installer in ${sources}: ${cmd}`);
    cp.execSync(cmd);
  }
}

async function main(fileName) {
  const cwd = process.cwd();
  const {
    sources,
    tarballs,
    localStore,
    store,
    globalStorePrefix,
    esyBootInstallerSrcPath,
  } = await setupPaths(cwd);
  await fetchSources({ tarballs, sources, esyBootInstallerSrcPath });
  await compileMakefile({
    fileName,
    localStore,
    store,
    globalStorePrefix,
    sources,
    esyBootInstallerSrcPath,
  });
}

main(process.argv[2]);
