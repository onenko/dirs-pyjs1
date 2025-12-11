const rootHierarchies = [];

function formatDate(ts) {
    if (!ts) return "";
    const d = new Date(ts * 1000);

    const pad = n => n.toString().padStart(2, "0");

    const YY = d.getFullYear().toString().slice(-2);
    const MM = pad(d.getMonth() + 1);
    const DD = pad(d.getDate());

    const hh = pad(d.getHours());
    const mm = pad(d.getMinutes());
    const ss = pad(d.getSeconds());

    return `${YY}${MM}${DD} ${hh}${mm}${ss}`;
}

function formatSize(bytes) {
    if (bytes < 1024) return bytes + "B";
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + "K";
    if (bytes < 1024 * 1024 * 1024) return (bytes / 1024 / 1024).toFixed(1) + "M";
    return (bytes / (1024 * 1024 * 1024)).toFixed(1) + "G";
}

// For DIR Navigation

function parsePath() {
    const hash = location.hash.slice(1);
    return hash ? hash.split("/") : [];
}


function createDirLinkOld(rootName, fullPath, dirNode) {
   const a = document.createElement("a");
   a.href = `#${[rootName, ...fullPath.slice(1), dirNode.name].join("/")}`;
//   a.textContent = dirNode.name;

   const dirNameSpan = document.createElement("span");
   dirNameSpan.className = "dir";
   dirNameSpan.textContent = dirNode.name;

   a.append(dirNameSpan);
   return a;
}

function createFileLink_ifWeNeedIt(fileNode) {
    const a = document.createElement("a");
    a.href = "#";
    a.textContent = fileNode.name;
    a.onclick = e => {
        e.preventDefault();
        console.log("File:", fileNode);
    };
    return a;
}

function createFileLink_asSimpleText(fileNode) {
    return fileNode.name;
}

function createFileLink(fileNode) {
   const fileNameSpan = document.createElement("span");
   fileNameSpan.className = "file";
   fileNameSpan.textContent = fileNode.name;
   return fileNameSpan;
}


function getDirectoryChain(rootEntry, path) {
    const chain = [];
    let current = rootEntry.hierarchy;

    chain.push({
        path: [rootEntry.name],
        dir: current
    });

    for (let i = 1; i < path.length; i++) {
        const next = current.childs.find(
            n => n.type === "dir" && n.name === path[i]
        );
        if (!next) break;

        current = next;
        chain.push({
            path: path.slice(0, i + 1),
            dir: current
        });
    }

    return chain;
}

function renderDirectorySection(rootName, dirNode, path) {
    const section = document.createElement("section");
    section.id = path.join("/");

    section.appendChild(createBreadcrumbHeader(path));

    for (const child of dirNode.childs) {
        const line = document.createElement("div");

	const dateSpan = document.createElement("span");
	dateSpan.className = "mono";
	const dateContent = formatDate(child.timestamp) + " ";
        var sizeContent = "<dir>";
        if (child.type === "file") {
            sizeContent = formatSize(child.size);
        }

	dateSpan.textContent = dateContent + " " + sizeContent;
	line.append(dateSpan, " ");

        if (child.type === "file") {
            line.append(createFileLink(child));
        } else {
            line.append(createDirLink(rootName, path, child));
        }

        section.appendChild(line);
    }

    return section;
}


function createDirLink(rootName, path, dirNode) {
   const fullPath = [...path, dirNode.name].join("/");

   const a = document.createElement("a");
   a.href = `#${fullPath}`;

   const dirNameSpan = document.createElement("span");
   dirNameSpan.className = "dir";
   dirNameSpan.textContent = dirNode.name;

   a.appendChild(dirNameSpan);

//    a.textContent = dirNode.name;
    return a;
}

//
function renderInitialPage() {
    if (!rootHierarchies.length) return;

    const container = document.getElementById("content");
    container.innerHTML = "";

    const path = parsePath();

    // Always render root list
    renderRootList(false);

    // NO HASH -> render EVERYTHING
    if (!path.length) {
        for (const rootEntry of rootHierarchies) {
            renderDirectoryTree(
                rootEntry.name,
                rootEntry.hierarchy,
                [rootEntry.name],
                container
            );
        }
        return;
    }

    // HASH -> render only chain to that directory
    const rootName = path[0];
    const rootEntry = rootHierarchies.find(r => r.name === rootName);
    if (!rootEntry) return;

    const chain = getDirectoryChain(rootEntry, path);

    for (const item of chain) {
        container.appendChild(
            renderDirectorySection(rootEntry.name, item.dir, item.path)
        );
    }
}


function renderDirectoryTree(rootName, dirNode, path, container) {
    // Render THIS directory
    container.appendChild(
        renderDirectorySection(rootName, dirNode, path)
    );

    // Recurse into subdirectories
    for (const child of dirNode.childs) {
        if (child.type === "dir") {
            renderDirectoryTree(
                rootName,
                child,
                [...path, child.name],
                container
            );
        }
    }
}





//
function renderRootList(clear = true) {
    const container = document.getElementById("content");
    if (clear) container.innerHTML = "";

    const h = document.createElement("h3");
    h.textContent = "Storage Directories";
    container.appendChild(h);

    for (const r of rootHierarchies) {
        const a = document.createElement("a");
        a.href = `#${r.name}`;
        a.textContent = r.name;

        const div = document.createElement("div");
        div.appendChild(a);
        container.appendChild(div);
    }
}

function createBreadcrumbHeader(path) {
    const h = document.createElement("h4");

    path.forEach((part, index) => {
        if (index > 0) {
            h.append(" / ");
        }

        const a = document.createElement("a");
        a.textContent = part;
        a.href = "#" + path.slice(0, index + 1).join("/");
        h.appendChild(a);
    });

    return h;
}











function buildHierarchy(records) {
    const nodes = new Map();
    const root = { type: "dir", name: "root", childs: [] };

    nodes.set("root", root);

    for (const [parentRef, timestamp, sizeOrId, name] of records) {
        const isDir = sizeOrId < 0;

        const node = isDir
            ? { type: "dir", name, timestamp, childs: [] }
            : { type: "file", name, timestamp, size: sizeOrId };

        const key = isDir ? `${name}#${sizeOrId}` : Symbol();

        node.__parentRef = parentRef;
        nodes.set(key, node);
    }

    for (const node of nodes.values()) {
        if (!node.__parentRef) continue;

        const parent = nodes.get(node.__parentRef);
        if (!parent) {
            throw new Error("Missing parent: " + node.__parentRef);
        }

        parent.childs.push(node);
        delete node.__parentRef;
    }

    return root;
}

function loadRoot(rootName) {
    return new Promise((resolve, reject) => {
        const script = document.createElement("script");
        script.src = `js/${rootName}.js`;

        script.onload = () => {
            const records = window[rootName];
            if (!records) {
                reject(`No data found for ${rootName}`);
                return;
            }

            const hierarchy = buildHierarchy(records);
            resolve(hierarchy);
        };

        script.onerror = () => reject(`Failed to load ${rootName}.js`);

        document.head.appendChild(script);
    });
}


async function loadAllRoots() {
    for (const rootName of ROOT_NAMES) {
        const hierarchy = await loadRoot(rootName);
        rootHierarchies.push({
            name: rootName,
            hierarchy
        });
    }

    console.log("All hierarchies loaded:", rootHierarchies);
}

loadAllRoots().then(() => {
    renderInitialPage(); // single initial render
});

