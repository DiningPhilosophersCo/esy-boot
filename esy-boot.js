const path = require("path");
let cp = require("child_process");
let fs = require("fs/promises");
let os = require("os");

const Tools = {
	init: (projectRoot) => ({
		buildEnvSh: `${projectRoot}/_boot/scripts/build-env.sh`,
		prepareBuildSh: `${projectRoot}/_boot/scripts/prepare-build.sh`,
		installArtifactsSh: `${projectRoot}/_boot/scripts/install-artifacts.sh`
	})
};

const Package = {
	nameOfLockEntry: (entry) => {
		let parts = entry.split("@");
		if (parts[0] !== "") {
			return parts[0];
		} else {
			return "@" + parts[1];
		}
	}
};

const Compile = {
	rule: ({ target, deps, buildCommands }) =>
		`${target}: ${deps.join(" ")}\n\t${buildCommands.join("\n\t")}`,
	makeFile: (rules) => {
		let compiledRules = rules.map(Compile.rule).join("\n\n");
		let phonyTargets = rules.filter((r) => r.phony).map((r) => r.target);
		if (phonyTargets.length) {
			return `.PHONY: ${phonyTargets.join(" ")}

${compiledRules}`;
		} else {
			return compiledRules;
		}
	}
};

const Env = {
	render(env, { localStore, store, globalStorePrefix, sources, project }) {
		return Object.keys(env).reduce((acc, key) => {
			acc[key] = renderEsyVariables(env[key], {
				localStore,
				store,
				globalStorePrefix,
				sources,
				project
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
	}
};

// {
//     return JSON.parse(` {
//   "id": "setup_esy_installer-fb3bf850",
//   "name": "setup-esy-installer",
//   "version": "github:ManasJayanth/esy-boot-installer#beee8a4775846651c958946ec1d6919e54bd49bc",
//   "sourceType": "immutable",
//   "buildType": "in-source",
//   "build": [
//     [
//       "make", "PREFIX=%{store}%/s/setup_esy_installer-fb3bf850",
//       "esy-installer"
//     ]
//   ],
//   "install": [
//     [ "make", "PREFIX=%{store}%/s/setup_esy_installer-fb3bf850", "install" ]
//   ],
//   "sourcePath": "${esyBootInstallerSrcPath}",
//   "rootPath": "%{globalStorePrefix}%/3/b/setup_esy_installer-fb3bf850",
//   "buildPath": "%{globalStorePrefix}%/3/b/setup_esy_installer-fb3bf850",
//   "stagePath": "%{store}%/s/setup_esy_installer-fb3bf850",
//   "installPath": "%{store}%/i/setup_esy_installer-fb3bf850",
//   "env": {
//     "cur__version": "github:ManasJayanth/esy-boot-installer#beee8a4775846651c958946ec1d6919e54bd49bc",
//     "cur__toplevel": "%{store}%/s/setup_esy_installer-fb3bf850/toplevel",
//     "cur__target_dir": "%{globalStorePrefix}%/3/b/setup_esy_installer-fb3bf850",
//     "cur__stublibs": "%{store}%/s/setup_esy_installer-fb3bf850/stublibs",
//     "cur__share": "%{store}%/s/setup_esy_installer-fb3bf850/share",
//     "cur__sbin": "%{store}%/s/setup_esy_installer-fb3bf850/sbin",
//     "cur__root": "%{globalStorePrefix}%/3/b/setup_esy_installer-fb3bf850",
//     "cur__original_root": "${esyBootInstallerSrcPath}",
//     "cur__name": "setup-esy-installer",
//     "cur__man": "%{store}%/s/setup_esy_installer-fb3bf850/man",
//     "cur__lib": "%{store}%/s/setup_esy_installer-fb3bf850/lib",
//     "cur__jobs": "4",
//     "cur__install": "%{store}%/s/setup_esy_installer-fb3bf850",
//     "cur__etc": "%{store}%/s/setup_esy_installer-fb3bf850/etc",
//     "cur__doc": "%{store}%/s/setup_esy_installer-fb3bf850/doc",
//     "cur__dev": "false",
//     "cur__bin": "%{store}%/s/setup_esy_installer-fb3bf850/bin",
//     "SHELL": "env -i /bin/bash --norc --noprofile",
//     "PATH": "%{store}%/i/ocaml-4.12.0-3a04ec8f/bin::/usr/local/bin:/usr/bin:/bin:/usr/sbin:/sbin",
//     "OCAML_TOPLEVEL_PATH": "%{store}%/i/ocaml-4.12.0-3a04ec8f/lib/ocaml",
//     "OCAMLPATH": "%{store}%/i/ocaml-4.12.0-3a04ec8f/lib:",
//     "OCAMLLIB": "%{store}%/i/ocaml-4.12.0-3a04ec8f/lib/ocaml",
//     "OCAMLFIND_LDCONF": "ignore",
//     "OCAMLFIND_DESTDIR": "%{store}%/s/setup_esy_installer-fb3bf850/lib",
//     "MAN_PATH": "%{store}%/i/ocaml-4.12.0-3a04ec8f/man:",
//     "CAML_LD_LIBRARY_PATH": "%{store}%/i/ocaml-4.12.0-3a04ec8f/lib/ocaml/stublibs:%{store}%/i/ocaml-4.12.0-3a04ec8f/lib/ocaml:"
//   },
//   "jbuilderHackEnabled": false,
//   "depspec": "dependencies(self)"
// }`);
//   }

// Example:
// virtualEsyBuildPlan(
//   {
//     name: "esy-boot-installer",
//     version: "ManasJayanth/esy-boot-installer:esy.json",
//   },
//   ["ocaml"],
//   "/Users/manas/development/esy/esy-mandir/_boot/sources/esy-boot-installer",
//   process.cwd()
// ).then(console.log);
// async function virtualEsyBuildPlan(
//   pkg /* { name: string, version: constraint } */,
//   deps,
//   pkgSourcePath,
//   currentProjectWorkingDirectory
// ) {
//   let virtualProject = "test-project";
//   let virtualProjectPath = path.join(os.tmpdir(), virtualProject);
//   await fs.mkdir(virtualProjectPath, { recursive: true });
//   let virtualProjectManifestPath = path.join(virtualProjectPath, "esy.json");
//   let cmd = `esy status -P ${currentProjectWorkingDirectory} --json`;
//   let currentProjectManifestPath = JSON.parse(
//     cp.execSync(cmd).toString()
//   ).rootPackageConfigPath;
//   const { dependencies } = JSON.parse(
//     await fs.readFile(currentProjectManifestPath)
//   );
//   await fs.writeFile(
//     virtualProjectManifestPath,
//     JSON.stringify({
//       dependencies: deps.reduce(
//         (acc, dep) => {
//           acc[dep] = dependencies[dep];
//           return acc;
//         },
//         { [pkg.name]: pkg.version }
//       ),
//     })
//   );
//   cp.execSync("esy i", { cwd: virtualProjectPath });
//   let plan = JSON.parse(
//     cp
//       .execSync(`esy build-plan -P ${virtualProjectPath} -p ${pkg.name}`, {
//         cwd: virtualProjectPath,
//       })
//       .toString()
//   );
//   plan.env.cur__original_root = plan.sourcePath = pkgSourcePath;
//   await fs.rmdir(virtualProjectPath, { recursive: true });
//   return plan;
// }

async function esyBuildPlan(cwd, packageName, opts = {}) {
	//
	// DEPRECATED: setup-esy-installer will no longer be
	// hooked into current sandbox
	// if (packageName === "setup-esy-installer") {
	//   return virtualEsyBuildPlan(
	//     {
	//       name: "esy-boot-installer",
	//       version: "ManasJayanth/esy-boot-installer:esy.json",
	//     },
	//     ["ocaml"],
	//     esyBootInstallerSrcPath,
	//     cwd
	//   );
	// }
	//

	//
	// We no longer cache the following command's output like we used to
	// 1. de-duplication must happen before graph traversal
	// 2. package ocaml might return different build-plans given
	//    how its also used to build esy-boot-installer in a separate
	//    sandbox.
	//
	const { release = false } = opts;
	let cmd;
	if (release) {
		cmd = `esy build-plan --release -P ${cwd}`;
	} else {
		cmd = `esy build-plan -P ${cwd}`;
	}
	if (packageName) {
		cmd = `${cmd} -p ${packageName}`;
	}
	return JSON.parse(cp.execSync(cmd).toString("utf-8"));
}

async function esyInstall(cwd) {
	let cmd = `esy install -P ${cwd}`;
	cp.execSync(cmd).toString("utf-8");
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
	projectRoot,
	esyBootInstallerInstallPath
) {
	let tools = Tools.init(projectRoot);
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
		let buildPlan = await esyBuildPlan(cwd, packageName);
		let renderedEnv = Env.render(buildPlan.env, {
			localStore,
			store,
			globalStorePrefix,
			sources,
			project
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
		let commandsFile = `${curTargetDir}.commands`;

		let renderedEnvStr = Env.toString(renderedEnv);
		await fs.writeFile(envFile, renderedEnvStr);
		await fs.writeFile(pathFile, renderedEnv["PATH"]);
		curInstallMap.set(packageName, curInstallImmutable);

		let buildCommands = buildPlan.build.map((arg) =>
			arg.map((cmd) =>
				renderEsyVariables(cmd, {
					localStore,
					store,
					globalStorePrefix,
					sources,
					project
				})
			)
		);
		buildCommands = [["pushd", curRoot]].concat(buildCommands);
		if (buildsInSource) {
			buildCommands = [
				["rm", "-rf", curRoot],
				["cp", "-R", `${curOriginalRoot}`, curRoot]
			].concat(buildCommands);
		} else {
			buildCommands = [
				["rm", "-rf", curTargetDir],
				["mkdir", "-p", curTargetDir]
			].concat(buildCommands);
		}
		buildCommands = [["bash", tools.prepareBuildSh, curInstall]]
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
									project
								})
							)
						)
						.map((args) => {
							if (args[0] === "esy-installer") {
								args[0] = path.join(
									esyBootInstallerInstallPath,
									"bin",
									"esy-installer"
								);
							}
							return args;
						})
					: [
						[
							"bash",
							tools.installArtifactsSh,
							envFile,
							pathFile,
							path.join(esyBootInstallerInstallPath, "bin", "esy-installer"),
							curInstallImmutable,
							packageName
						]
					]
			)
			.concat([["popd"]]);
		// DEPRECATED: the following approach is no longer in use.
		// // A trick to make sure setup-esy-installer is run before everything else, including Dune
		// if (packageName === "@opam/dune" || packageName === "@opam/ocamlbuild") {
		//   dependencies.push("setup-esy-installer@vvv@hhh");
		// }
		for (let dep of dependencies) {
			makeFile = await traverse(
				makeFile,
				curInstallMap,
				{ localStore, store, globalStorePrefix, sources, project },
				lockFile,
				dep,
				cwd,
				projectRoot,
				esyBootInstallerInstallPath
			);
		}

		let deps = dependencies.map(Package.nameOfLockEntry);

		buildCommands = buildCommands.map((command) =>
			command.map((c) => `"${c}"`)
		);
		await fs.writeFile(
			commandsFile,
			`#!/bin/sh
set -ex;
${buildCommands
				.map((command) => 'env -i $(cat "$ENV_FILE") ' + command.join(" "))
				.join(";\n")}`
		);

		makeFile.set(curInstallImmutable, {
			target: curInstallImmutable,
			deps,
			buildCommands: [`PATH=$(shell cat "${pathFile}")`, `sh ${commandsFile}`]
		});

		makeFile.set(packageName, {
			target: packageName,
			deps: [curInstallImmutable],
			buildCommands: [],
			phony: true
		});

		return makeFile;
	}
}

async function emitBuild(
	cwd,
	projectRoot,
	lockFile,
	localStore,
	store,
	globalStorePrefix,
	sources,
	esyBootInstallerInstallPath
) {
	const project = cwd;
	const rootProjectBuildPlan = await esyBuildPlan(cwd);
	/* type rule = { target, deps, build } */
	const makeFile /* Map<string, rule> */ = new Map();
	let curInstallMap = new Map();
	let rulesMap = await traverse(
		makeFile,
		curInstallMap,
		{ localStore, store, globalStorePrefix, sources, project },
		lockFile,
		lockFile.root,
		cwd,
		projectRoot,
		esyBootInstallerInstallPath
	);
	return Compile.makeFile(
		Array.from(rulesMap.values()).map((rule) => {
			let { deps } = rule;
			deps = deps.map((name) => {
				let installPath = curInstallMap.get(name);
				if (installPath) {
					return installPath;
				} else {
					return name;
				}
			});
			return { ...rule, deps };
		})
	);
}

async function compileMakefile({
	fileName,
	lockFile,
	localStore,
	store,
	globalStorePrefix,
	sources,
	esyBootInstallerInstallPath,
	cwd,
	projectRoot
}) {
	let makeFile = await emitBuild(
		cwd,
		projectRoot,
		lockFile,
		localStore,
		store,
		globalStorePrefix,
		sources,
		esyBootInstallerInstallPath
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
	const esyBootInstallerTarballs = path.join(
		cwd,
		"_boot",
		"esy-boot-installer-tarballs"
	);
	const scripts = path.join(cwd, "_boot", "scripts");
	await fs.cp(path.join(__dirname, "scripts"), scripts, { recursive: true });
	const sources = path.join(cwd, "_boot", "sources");
	const esyBootInstallerSrcPath = path.join(sources, "esy-boot-installer");
	if (!(await exists(esyBootInstallerSrcPath))) {
		await fs.cp(
			path.join(__dirname, "esy-boot-installer"),
			esyBootInstallerSrcPath,
			{ recursive: true }
		);
	}
	await fs.mkdir(sources, { recursive: true });
	const localStore = path.join(cwd, "_boot", "store");
	await fs.mkdir(localStore, { recursive: true });
	const store = path.join(cwd, "_boot", "store");
	await fs.mkdir(store, { recursive: true });
	const globalStorePrefix = path.join(cwd, "_boot", "store");
	await fs.mkdir(globalStorePrefix, { recursive: true });
	await fs.mkdir(path.join(globalStorePrefix, "b"), { recursive: true });
	await fs.mkdir(path.join(globalStorePrefix, "i"), { recursive: true });
	await fs.mkdir(path.join(globalStorePrefix, "3", "b"), { recursive: true });
	await fs.mkdir(path.join(globalStorePrefix, "3", "i"), { recursive: true });

	return {
		sources,
		tarballs,
		localStore,
		store,
		globalStorePrefix,
		esyBootInstallerSrcPath,
		esyBootInstallerTarballs
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
async function fetchSources({
	cwd,
	tarballs,
	esyBootInstallerTarballs,
	sources,
	esyBootInstallerSrcPath
}) {
	let cmd = `sh ${__dirname}/scripts/fetch-sources.sh --sources-cache=${sources} --tarballs=${tarballs}`;
	log(`Fetching source tarballs with '${cmd}'`);
	cp.execSync(cmd);
	cmd = `sh ${__dirname}/scripts/fetch-sources.sh --sources-cache=${sources} --tarballs=${esyBootInstallerTarballs} --project=${esyBootInstallerSrcPath}`;
	log(`Fetching source tarballs for esy-boot-installer with '${cmd}'`);
	cp.execSync(cmd);
}

async function compileEsyBootInstaller({ esyBootInstallerSrcPath, ...args }) {
	let fileName = "boot.esy-boot-installer.Makefile";
	const lockFile = require(
		path.join(esyBootInstallerSrcPath, "esy.lock", "index.json")
	);
	esyInstall(esyBootInstallerSrcPath);
	// esy status doesn't work here because esy uses localStore, _esy,
	// to install artifacts. We, OTOH, have set localStore = globalStore
	let buildPlan = await esyBuildPlan(esyBootInstallerSrcPath);
	let installPath = renderEsyVariables(buildPlan.installPath, args);
	await compileMakefile({
		fileName,
		lockFile,
		installPath,
		...args,
		cwd: esyBootInstallerSrcPath
	});
	return installPath;
}

async function manualCopySource(pkg, cwd, sources) {
	/////////////////////////////////////////////////////////////////////////////////////////////////////////
	// BOOT_SEQ_PATH="./_boot/sources/$(esy build-plan -p @opam/seq | jq -r .sourcePath | xargs basename)" //
	// mkdir -p "$BOOT_SEQ_PATH"									   //
	// SEQ_PACKAGEID=$(jq -r 'keys[]' ./_esy/default/installation.json | grep opam/seq)			   //
	// SEQ_SOURCE_PATH_QUERY=".[\"$SEQ_PACKAGEID\"]"							   //
	// SEQ_SOURCE_PATH=$(jq -r "$SEQ_SOURCE_PATH_QUERY" ./_esy/default/installation.json)		   //
	// mkdir -p _boot/store/3/b _boot/store/b _boot/store/i						   //
	// cp -r "$SEQ_SOURCE_PATH" "$(dirname $BOOT_SEQ_PATH)"						   //
	/////////////////////////////////////////////////////////////////////////////////////////////////////////

	try {
		const esyBuildPlanPkgSrcPath = (await esyBuildPlan(cwd, pkg)).sourcePath;
		const bootStorePkgSrcPath = path.join(
			sources,
			path.basename(esyBuildPlanPkgSrcPath)
		);
		const installationJson = require(
			path.join(cwd, "_esy", "default", "installation.json")
		);
		const possiblePkgPackageIDs = Object.keys(installationJson).filter((k) =>
			k.startsWith(pkg)
		);
		let pkgPackageID;
		if (possiblePkgPackageIDs.length > 0) {
			pkgPackageID = possiblePkgPackageIDs[0];
			let pkgSourcePath = installationJson[pkgPackageID];
			console.log("rm -rf", bootStorePkgSrcPath);
			await fs.rmdir(bootStorePkgSrcPath, { recursive: true });
			await fs.mkdir(bootStorePkgSrcPath, { recursive: true });
			console.log("Copying", pkgSourcePath, "to", bootStorePkgSrcPath);
			await fs.cp(pkgSourcePath, bootStorePkgSrcPath, { recursive: true });
		}
	} catch (e) {
		if (
			e &&
			e.stderr &&
			e.stderr.toString() !==
			`error: no package found: ${pkg}
  
esy: exiting due to errors above
`
		) {
			throw e;
		} else {
			console.error(e);
		}
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
		esyBootInstallerTarballs
	} = await setupPaths(cwd);
	await fetchSources({
		cwd,
		tarballs,
		sources,
		esyBootInstallerSrcPath,
		esyBootInstallerTarballs
	});

	// FIXME: @opam/seq doesn't get extracted properly. Has to be done from esy store
	// FIXME: ocamlfind doesn't get extracted properly. Has to be done from esy store

	// It's not necessary that @opam/seq be depended on by a non-dev dependency
	// To be account for both cases, we skip the --release flag for @opam/ seq
	// Else, we run into,
	// error: not build defined for @opam/seq
	await manualCopySource("@opam/seq", cwd, sources, { release: false });
	await manualCopySource("@opam/ocamlfind", cwd, sources);
	await manualCopySource("@opam/ocamlbuild", cwd, sources);

	const esyBootInstallerInstallPath = await compileEsyBootInstaller({
		localStore,
		store,
		globalStorePrefix,
		sources,
		esyBootInstallerSrcPath,
		cwd,
		projectRoot: cwd
	});
	const lockFile = require(path.join(cwd, "esy.lock", "index.json"));
	await compileMakefile({
		fileName,
		lockFile,
		localStore,
		store,
		globalStorePrefix,
		sources,
		esyBootInstallerInstallPath,
		cwd,
		projectRoot: cwd
	});
}

main(process.argv[2]);
