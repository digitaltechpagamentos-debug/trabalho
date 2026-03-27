const express = require("express");
const fs = require("fs");
const path = require("path");

const app = express();

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
'https://gcqahmegpidkgedokbaa.supabase.co',
'sb_publishable_Hdwuix4_G8H1l1ywDiSa0g_27Ut_b4R'
);

// 🔥 SERVIR ARQUIVOS
app.use(express.static(path.join(__dirname, "public")));

let clientes = [];
let usuarios = [];

/* ================= CARREGAR ================= */

try {
if (fs.existsSync(path.join(__dirname, "clientes.json"))) {
clientes = JSON.parse(fs.readFileSync(path.join(__dirname, "clientes.json")));
}
} catch (erro) {
console.log("Erro clientes.json:", erro);
clientes = [];
}

try {
if (fs.existsSync(path.join(__dirname, "usuarios.json"))) {
usuarios = JSON.parse(fs.readFileSync(path.join(__dirname, "usuarios.json")));
}
} catch (erro) {
console.log("Erro usuarios.json:", erro);
usuarios = [];
}

/* ================= ROTA PRINCIPAL ================= */

app.get("/", (req, res) => {
res.sendFile(path.join(__dirname, "public", "login.html"));
});

/* ================= LOGIN ================= */

app.post("/login", async (req, res) => {
const { usuario, senha } = req.body;

const { data: user } = await supabase
.from("usuarios")
.select("*")
.eq("usuario", usuario)
.eq("senha", senha)
.maybeSingle();

if (!user) {
return res.status(401).json({ mensagem: "Login inválido" });
}

if (user.bloqueado) {
return res.status(403).json({ mensagem: "Usuário bloqueado" });
}

res.json({ usuario: user.usuario, tipo: user.tipo });
});

/* ================= CRIAR CLIENTE ================= */

app.post("/criar-cliente", async (req, res) => {

const { email, senha, servidor, dono } = req.body;

if(!email || !senha){
return res.status(400).json({ erro: "Dados incompletos" });
}

const data = new Date();
data.setDate(data.getDate() + 30);

const { error } = await supabase
.from("clientes")
.insert([
{
email,
senha,
servidor,
dono,
vencimento: data.toISOString()
}
]);

if (error) {
console.log("ERRO AO SALVAR:", error);
return res.status(500).json({ erro: error.message });
}

res.json({ sucesso: true });

});

/* ================= DASHBOARD ================= */

app.get("/dashboard-info", (req, res) => {
const hoje = new Date();

const totalClientes = clientes.length;
const clientesAtivos = clientes.filter(c => new Date(c.vencimento) > hoje).length;
const clientesVencidos = clientes.filter(c => new Date(c.vencimento) < hoje).length;

const vencendoHoje = clientes.filter(c => {
const data = new Date(c.vencimento);
return data.toDateString() === hoje.toDateString();
}).length;

const totalRevendedores = usuarios.filter(u => u.tipo === "revendedor").length;

res.json({
creditos: 999999,
totalClientes,
totalRevendedores,
vencendoHoje,
clientesAtivos,
clientesVencidos
});
});

/* ================= CLIENTES ================= */

app.get("/clientes/:usuario", async (req, res) => {
const usuario = req.params.usuario;

let query = supabase.from("clientes").select("*");

if (usuario !== "admin") {
query = query.eq("dono", usuario);
}

const { data, error } = await query;

if (error) {
console.log(error);
return res.status(500).json({ erro: error.message });
}

res.json(data);
});

/* ================= REVENDEDORES ================= */

// 🔥 CRIAR REVENDEDOR
app.post("/criar-revendedor", async (req, res) => {
const { usuario, senha, pai } = req.body;

try {

const { data: existe } = await supabase
.from("usuarios")
.select("*")
.eq("usuario", usuario)
.maybeSingle();

if (existe) {
return res.status(400).json({ mensagem: "Usuário já existe" });
}

const { error } = await supabase
.from("usuarios")
.insert([
{
usuario,
senha,
tipo: "revendedor",
creditos:0,
bloqueado:false,
pai
}
]);

if (error) {
console.log("ERRO INSERT:", error);
return res.status(500).json({ erro: error.message });
}

res.json({ mensagem: "Revendedor criado com sucesso" });

} catch (err) {
console.log("ERRO GERAL:", err);
res.status(500).json({erro: "erro interno"});
}

});

// 🔥 LISTAR REVENDEDORES
app.get("/revendedores/:usuario", async (req, res) => {
const usuario = req.params.usuario;

// ADMIN vê todos
if(usuario === "admin"){

const { data, error } = await supabase
.from("usuarios")
.select("*")
.eq("tipo", "revendedor");

if(error){
return res.status(500).json({ erro: error.message });
}

return res.json(data);
}

// REVENDEDOR vê só os dele
const { data, error } = await supabase
.from("usuarios")
.select("*")
.eq("pai", usuario);

if(error){
return res.status(500).json({ erro: error.message });
}

return res.json(data);

});

/* ================= EXCLUIR USUÁRIO ================= */

app.post("/excluir-usuario", async (req, res) => {
const { usuario } = req.body;

const { error } = await supabase
.from("usuarios")
.delete()
.eq("usuario", usuario);

if (error) {
return res.status(500).json({ erro: error.message });
}

res.json({ mensagem: "Usuário excluído com sucesso" });
});

/* ================= CREDITOS ================= */

app.get("/creditos/:usuario", async (req, res) => {

const usuario = req.params.usuario;

const { data } = await supabase
.from("usuarios")
.select("creditos")
.eq("usuario", usuario)
.maybeSingle();

if (!data) {
return res.json({ creditos: 0 });
}

res.json({ creditos: data.creditos || 0 });

});

/* ================= TESTE ================= */

app.get("/teste", async (req, res) => {
const { data, error } = await supabase
.from("usuarios")
.select("*");

if (error) {
return res.json({ erro: error.message });
}

res.json(data);
});

/* ================= SERVIDOR ================= */

const PORT = process.env.PORT || 3000;

app.get("/ping", (req, res) => {
res.send("ok");
});

app.listen(PORT, "0.0.0.0", () => {
console.log("Servidor rodando na porta " + PORT);
});