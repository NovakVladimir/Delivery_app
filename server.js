const express = require("express");
const mysql = require("mysql2");
const cors = require("cors");

const app = express();
const port = 8000;

app.use(cors());
app.use(express.json()); // Додано для обробки JSON даних

const connection = mysql.createConnection({
  host: "localhost",
  user: "root",
  password: "Ghjcnjpyfq2012*",
  database: "food",
});

connection.connect((err) => {
  if (err) {
    console.error("Помилка підключення до бази даних:", err);
  } else {
    console.log("Підключено до бази даних");
  }
});

// Маршрут для отримання списку магазинів
app.get("/shops", (req, res) => {
  const query = "SELECT * FROM shops";
  connection.query(query, (error, results) => {
    if (error) {
      console.error("Помилка при виконанні запиту:", error);
      res.status(500).json({ error: "Помилка сервера" });
    } else {
      res.json(results);
    }
  });
});

// Маршрут для отримання списку всіх товарів
app.get("/products", (req, res) => {
  const query = "SELECT * FROM products";
  connection.query(query, (error, results) => {
    if (error) {
      console.error("Помилка при виконанні запиту:", error);
      res.status(500).json({ error: "Помилка сервера" });
    } else {
      res.json(results);
    }
  });
});

// Маршрут для отримання даних продуктів за id магазина
app.get("/shops/:id_shop/products", (req, res) => {
  const { id_shop } = req.params;

  const query = `SELECT id_products, name, image, price FROM products WHERE id_shop = ?`;
  connection.query(query, [id_shop], (err, result) => {
    if (err) {
      res.status(500).send("Failed to fetch products");
    } else {
      res.status(200).json(result);
    }
  });
});

// Маршрут для створення нової покупки
app.post("/purchases", (req, res) => {
  const { id_products, quantity, user } = req.body; // Оновлено: змінено назву id_user на user
  // Створення нового користувача в таблиці "users"
  const userQuery =
    "INSERT INTO users (name, telephone, address, email) VALUES (?, ?, ?, ?)";
  const userValues = [user.name, user.telephone, user.address, user.email];

  connection.query(userQuery, userValues, (error, userResult) => {
    if (error) {
      console.error("Помилка при створенні користувача:", error);
      res.status(500).json({ error: "Помилка сервера1" });
    } else {
      const userId = userResult.insertId; // Отримуємо ID нового користувача

      // Створення нової покупки в таблиці "purchases"
      const purchaseQuery =
        "INSERT INTO purchases (id_user, price) VALUES (?, ?)";
      const purchaseValues = [userId, 0]; // Встановлюємо початкову вартість покупки як 0

      connection.query(
        purchaseQuery,
        purchaseValues,
        (error, purchaseResult) => {
          if (error) {
            console.error("Помилка при створенні покупки:", error);
            res.status(500).json({ error: "Помилка сервера2" });
          } else {
            const purchaseId = purchaseResult.insertId; // Отримуємо ID нової покупки

            // Додавання деталей покупки в таблицю "purchase_detailed"
            const purchaseDetailedQuery =
              "INSERT INTO purchase_detailed (id_purchase, id_product, product_quantity, price) VALUES ?";
            const purchaseDetailedValues = id_products.map(
              (productId, index) => [purchaseId, productId, quantity[index], 0]
            );

            connection.query(
              purchaseDetailedQuery,
              [purchaseDetailedValues],
              (error, detailedResult) => {
                if (error) {
                  console.error(
                    "Помилка при додаванні деталей покупки:",
                    error
                  );
                  res.status(500).json({ error: "Помилка сервера3" });
                } else {
                  // Обчислення загальної вартості покупки
                  const totalPriceQuery = `
                UPDATE purchases p
                SET p.price = (
                  SELECT SUM(pd.product_quantity * pr.price)
                  FROM purchase_detailed pd
                  JOIN products pr ON pd.id_product = pr.id_products
                  WHERE pd.id_purchase = p.id_purchase
                )
                WHERE p.id_purchase = ?
              `;

                  connection.query(
                    totalPriceQuery,
                    [purchaseId],
                    (error, priceResult) => {
                      if (error) {
                        console.error(
                          "Помилка при обчисленні загальної вартості покупки:",
                          error
                        );
                        res.status(500).json({ error: "Помилка сервера4" });
                      } else {
                        // Оновлення кількості продукту у таблиці "products"
                        const updateQuantityQuery =
                          "UPDATE products SET quantity = quantity - ? WHERE id_products = ?";
                        const updateQuantityValues = id_products.map(
                          (productId, index) => [quantity[index], productId]
                        );

                        connection.query(
                          updateQuantityQuery,
                          updateQuantityValues,
                          (error, quantityResult) => {
                            if (error) {
                              console.error(
                                "Помилка при оновленні кількості продукту:",
                                error
                              );
                              res
                                .status(500)
                                .json({ error: "Помилка сервера" });
                            } else {
                              res
                                .status(201)
                                .json({ message: "Покупку збережено" });
                            }
                          }
                        );
                      }
                    }
                  );
                }
              }
            );
          }
        }
      );
    }
  });
});

// Запуск сервера
app.listen(port, () => {
  console.log(`Сервер працює на порті ${port}`);
});
