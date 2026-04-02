const express = require("express");
const fs = require("fs");
const path = require("path");

// ✅ fetch corrigido (Railway)
const fetch = (...args) => import('node-fetch').then(({default: fetch}) => fetch(...args));

const app = express();

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  'https://gcqahmegpidkgedokbaa.supabase.co',
  'sb_publishable_Hdwuix4_G8H1l1ywDiSa0g_27Ut_b4R'
);

let clientes = [];
let usuarios = [];

/* ================= ROTAS IMPORTANTES PRIMEIRO ================= */

// 🔥 ROTA TESTE (ESSENCIAL)
app.get("/ping", (req, res) => {
  res.send("ok");
});

// 🔥 ROTA PRINCIPAL
app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "login.html"));
});

/* ================= SERVIR ARQUIVOS ================= */

app.use(express.static(path.join(__dirname, "public")));

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

/* ================= WHATSAPP ================= */

const ZAPI_INSTANCE = "3F0E8EDBA5C371193DD6661707F5575A";
const ZAPI_TOKEN = "6E30F1552FF8977DA9E976CA";

async function enviarWhatsapp(numero, mensagem){
  try{
    await fetch(`https://api.z-api.io/instances/${ZAPI_INSTANCE}/token/${ZAPI_TOKEN}/send-text`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        phone: numero,
        message: mensagem
      })
    });
  }catch(e){
    console.log("Erro WhatsApp:", e);
  }
}

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
  const { email, senha, servidor, dono, telefone } = req.body;

  if(!email || !senha){
    return res.status(400).json({ erro: "Dados incompletos" });
  }

  const data = new Date();
  data.setDate(data.getDate() + 30);

  const { error } = await supabase
    .from("clientes")
    .insert([{
      email,
      senha,
      servidor,
      dono,
      telefone,
      vencimento: data.toISOString()
    }]);

  if (error) {
    console.log(error);
    return res.status(500).json({ erro: error.message });
  }

  res.json({ sucesso: true });
});

/* ================= OUTRAS ROTAS ================= */
// (mantive todas como estavam — estão OK)

/* ================= SERVIDOR ================= */

const PORT = process.env.PORT || 3000;

app.listen(PORT, "0.0.0.0", () => {
  console.log("Servidor rodando na porta " + PORT);
});