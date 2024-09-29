const express = require("express");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const fs = require("fs");
const app = express();

app.use(express.json());

const secretKey = "12345678910qwerty"; // не использовал библиотеку .env тут

const loadManagers = () => {
  const data = fs.readFileSync("managers.json", "utf-8");
  return JSON.parse(data);
};

const saveManagers = (managers) => {
  fs.writeFileSync("managers.json", JSON.stringify(managers, null, 2));
};

const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ message: "Токен отсутствует или неправильный формат" });
  }

  const token = authHeader.split(' ')[1];

  try {
    const decoded = jwt.verify(token, secretKey);

    const managers = loadManagers();
    const manager = managers.find((mgr) => mgr.id === decoded.id);
    if (!manager) {
      return res.status(403).json({ message: "Пользователь не найден" });
    }

    req.user = manager;
    next();
  } catch (error) {
    return res.status(403).json({ message: "Невалидный токен" });
  }
};

const requireSuperUser = (req, res, next) => {
  if (!req.user.super) {
    return res.status(403).json({ message: "Доступ запрещен. Только для суперпользователей." });
  }
  next();
};

app.post("/api/auth/register", async (req, res) => {
    const { email, password, superUser } = req.body;
  
  const managers = loadManagers();

  const existingUser = managers.find((manager) => manager.email === email);
  if (existingUser) {
    return res.status(400).json({ message: "Такой менеджер уже есть, бро" });
  }

  const hashedPassword = await bcrypt.hash(password, 10);

  const newManager = {
    id: managers.length + 1,
    email,
    password: hashedPassword,
    super: superUser || false,
  };

  managers.push(newManager);
  saveManagers(managers);

  res.status(201).json({ message: "Менеджер успешно зарегистрирован!" });
});

app.post("/api/auth/login", async (req, res) => {
  const { email, password } = req.body;
  
  const managers = loadManagers();

  const manager = managers.find((manager) => manager.email === email);
  if (!manager) {
    return res.status(400).json({ message: "Менеджер не найдет :/" });
  }

  const isPasswordValid = await bcrypt.compare(password, manager.password);
  if (!isPasswordValid) {
    return res.status(401).json({ message: "Не тот пароль" });
  }

  const token = jwt.sign({ id: manager.id, email: manager.email }, secretKey, {
    expiresIn: "5m",
  });

  res.json({ token });
});

app.use("/api", (req, res, next) => {
  if (req.path.startsWith('/auth')) {
    next();
  } else {
    authenticateToken(req, res, next); 
  }
});

app.get("/api/data", (req, res) => {
  res.json({ message: "Данные доступны всем авторизованным пользователям", user: req.user });
});

app.post("/api/data", requireSuperUser, (req, res) => {
  res.status(201).json({ message: "Данные созданы суперпользователем" });
});

app.put("/api/data/:id", requireSuperUser, (req, res) => {
  res.status(200).json({ message: `Данные с id ${req.params.id} обновлены суперпользователем` });
});

app.delete("/api/data/:id", requireSuperUser, (req, res) => {
  res.status(200).json({ message: `Данные с id ${req.params.id} удалены суперпользователем` });
});

app.listen(3000, () => {
  console.log("Example app listening on port 3000!");
});
