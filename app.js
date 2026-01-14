const express = require('express');
const multer = require('multer');
const fs = require('fs');
const { diffLines } = require('diff');

const app = express();
const upload = multer({ dest: 'uploads/' });

app.use(express.urlencoded({ extended: true }));

app.get('/', (req, res) => {
	res.send(`
<!DOCTYPE html>
<html>
<head>
<meta charset="UTF-8" />
<title>Side-by-Side File Diff</title>
<style>
body { font-family: Arial, sans-serif; padding: 40px; }
.container { max-width: 1200px; margin: auto; }
</style>
</head>
<body>
<div class="container">
<h1>Side-by-Side File Diff</h1>
<form action="/diff" method="post" enctype="multipart/form-data">
<div>
<label>Original file:</label><br />
<input type="file" name="fileA" required />
</div><br />
<div>
<label>Modified file:</label><br />
<input type="file" name="fileB" required />
</div><br />
<button type="submit">Compare</button>
</form>
</div>
</body>
</html>
`);
});

app.post(
	'/diff',
	upload.fields([{ name: 'fileA' }, { name: 'fileB' }]),
	(req, res) => {
		const fileA = fs.readFileSync(req.files.fileA[0].path, 'utf8');
		const fileB = fs.readFileSync(req.files.fileB[0].path, 'utf8');

		const diff = diffLines(fileA, fileB, { newlineIsToken: true });

		let leftLine = 1;
		let rightLine = 1;
		let rows = '';

		diff.forEach(part => {
			const lines = part.value.split('\n');
			if (part.value.endsWith('\n')) lines.pop();

			lines.forEach(line => {
				const content = escapeHtml(line === '' ? ' ' : line);

				if (part.added) {
					rows += `<tr>
<td class="line-num"></td>
<td></td>
<td class="line-num">${rightLine++}</td>
<td class="added">${content}</td>
</tr>`;
				} else if (part.removed) {
					rows += `<tr>
<td class="line-num">${leftLine++}</td>
<td class="removed">${content}</td>
<td class="line-num"></td>
<td></td>
</tr>`;
				} else {
					rows += `<tr>
<td class="line-num">${leftLine++}</td>
<td>${content}</td>
<td class="line-num">${rightLine++}</td>
<td>${content}</td>
</tr>`;
				}
			});
		});


		res.send(`
<!DOCTYPE html>
<html>
<head>
<meta charset="UTF-8" />
<title>Diff Result</title>
<style>
body { font-family: Arial, sans-serif; padding: 40px; }
.container { max-width: 1200px; margin: auto; }

.diff-wrapper {
	display: flex;
	gap: 12px;
}

.diff-scroll {
	flex: 1;
	max-height: 80vh;
	overflow-y: auto;
}

.minimap {
	width: 80px;
	position: relative;
	border-left: 1px solid #ccc;
	background: #fafafa;
}

.mini-change {
	position: absolute;
	left: 0;
	right: 0;
	height: 4px;
	cursor: pointer;
}

.mini-added { background: #8fd19e; }
.mini-removed { background: #f5a3a3; }

table { width: 100%; border-collapse: collapse; font-family: monospace; }
th, td { padding: 4px 8px; vertical-align: top; }
th { background: #f0f0f0; }

.line-num {
	width: 50px;
	text-align: right;
	color: #888;
	background: #fafafa;
}

.added { background: #e6ffed; }
.removed { background: #ffeef0; }

td {
	white-space: pre-wrap;
	word-break: break-word;
}
</style>
</head>
<body>
<div class="container">
<h1>Diff Result</h1>

<div class="diff-wrapper">
	<div class="diff-scroll" id="diffScroll">
		<table border="1">
			<thead>
				<tr>
					<th colspan="2">Original</th>
					<th colspan="2">Modified</th>
				</tr>
				<tr>
					<th>#</th>
					<th>Code</th>
					<th>#</th>
					<th>Code</th>
				</tr>
			</thead>
			<tbody>
				${rows}
			</tbody>
		</table>
	</div>
	<div class="minimap" id="minimap"></div>
</div>

<br />
<a href="/">Compare another</a>
</div>

<script>
const diffScroll = document.getElementById('diffScroll');
const minimap = document.getElementById('minimap');
const rows = diffScroll.querySelectorAll('tbody tr');

rows.forEach((row, index) => {
	const isAdded = row.querySelector('.added');
	const isRemoved = row.querySelector('.removed');
	if (!isAdded && !isRemoved) return;

	const marker = document.createElement('div');
	marker.className = 'mini-change ' + (isAdded ? 'mini-added' : 'mini-removed');

	marker.style.top = (index / rows.length) * 100 + '%';

	marker.onclick = () => {
		diffScroll.scrollTop =
			(index / rows.length) * diffScroll.scrollHeight;
	};

	minimap.appendChild(marker);
});
</script>

</body>
</html>
`);
	}
);


function escapeHtml(str) {
	return str
		.replace(/&/g, '&amp;')
		.replace(/</g, '&lt;')
		.replace(/>/g, '&gt;');
}

const PORT = 3000;
app.listen(PORT, () => {
	console.log(`Diff app running at http://localhost:${PORT}`);
});
