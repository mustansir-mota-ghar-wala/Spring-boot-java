package com.mustansir.smartinventory.repository;

import com.mustansir.smartinventory.model.Product;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.support.GeneratedKeyHolder;
import org.springframework.jdbc.support.KeyHolder;
import org.springframework.stereotype.Repository;

import java.sql.PreparedStatement;
import java.sql.Statement;
import java.util.List;

@Repository
public class ProductRepository {

    private final JdbcTemplate jdbcTemplate;

    public ProductRepository(JdbcTemplate jdbcTemplate) {
        this.jdbcTemplate = jdbcTemplate;
    }

    public List<Product> findAll() {

        String sql = "SELECT * FROM products";

        return jdbcTemplate.query(sql, (rs, rowNum) -> {

            Product product = new Product();

            product.setId(rs.getInt("id"));
            product.setName(rs.getString("name"));
            product.setCategory(rs.getString("category"));
            product.setQuantity(rs.getInt("quantity"));
            product.setPrice(rs.getBigDecimal("price"));
            product.setExpiryDate(
                    rs.getDate("expiry_date").toLocalDate());

            return product;
        });
    }

    public List<Product> findLowStockProducts() {

        String sql = "SELECT * FROM products WHERE quantity <= 5";

        return jdbcTemplate.query(sql, (rs, rowNum) -> {

            Product product = new Product();

            product.setId(rs.getInt("id"));
            product.setName(rs.getString("name"));
            product.setCategory(rs.getString("category"));
            product.setQuantity(rs.getInt("quantity"));
            product.setPrice(rs.getBigDecimal("price"));
            product.setExpiryDate(
                    rs.getDate("expiry_date").toLocalDate());

            return product;
        });
    }

    public List<Product> findExpiringSoonProducts() {

        String sql = """
                SELECT * FROM products
                WHERE expiry_date IS NOT NULL
                AND expiry_date BETWEEN CURDATE()
                AND DATE_ADD(CURDATE(), INTERVAL 30 DAY)
                """;

        return jdbcTemplate.query(sql, (rs, rowNum) -> {

            Product product = new Product();

            product.setId(rs.getInt("id"));
            product.setName(rs.getString("name"));
            product.setCategory(rs.getString("category"));
            product.setQuantity(rs.getInt("quantity"));
            product.setPrice(rs.getBigDecimal("price"));
            product.setExpiryDate(
                    rs.getDate("expiry_date").toLocalDate());

            return product;
        });
    }

    public List<Product> searchProductsByName(String name) {

        String sql = """
                SELECT * FROM products
                WHERE name LIKE ?
                """;

        String searchPattern = "%" + name + "%";

        return jdbcTemplate.query(sql, (rs, rowNum) -> {

            Product product = new Product();

            product.setId(rs.getInt("id"));
            product.setName(rs.getString("name"));
            product.setCategory(rs.getString("category"));
            product.setQuantity(rs.getInt("quantity"));
            product.setPrice(rs.getBigDecimal("price"));
            product.setExpiryDate(
                    rs.getDate("expiry_date").toLocalDate());

            return product;

        }, searchPattern);
    }

    // Dashboard: total number of products
    public int countProducts() {

        String sql = "SELECT COUNT(*) FROM products";

        return jdbcTemplate.queryForObject(sql, Integer.class);
    }

    // Dashboard: number of low-stock products
    public int countLowStockProducts() {

        String sql = """
                SELECT COUNT(*)
                FROM products
                WHERE quantity <= 5
                """;

        return jdbcTemplate.queryForObject(sql, Integer.class);
    }

    // Dashboard: number of products expiring within 30 days
    public int countExpiringSoonProducts() {

        String sql = """
                SELECT COUNT(*)
                FROM products
                WHERE expiry_date IS NOT NULL
                AND expiry_date BETWEEN CURDATE()
                AND DATE_ADD(CURDATE(), INTERVAL 30 DAY)
                """;

        return jdbcTemplate.queryForObject(sql, Integer.class);
    }

    // Dashboard: total value of all inventory
    public double calculateInventoryValue() {

        String sql = """
                SELECT COALESCE(SUM(quantity * price), 0)
                FROM products
                """;

        return jdbcTemplate.queryForObject(sql, Double.class);
    }

    public Product findById(int id) {

        String sql = "SELECT * FROM products WHERE id = ?";

        List<Product> products = jdbcTemplate.query(sql, (rs, rowNum) -> {

            Product product = new Product();

            product.setId(rs.getInt("id"));
            product.setName(rs.getString("name"));
            product.setCategory(rs.getString("category"));
            product.setQuantity(rs.getInt("quantity"));
            product.setPrice(rs.getBigDecimal("price"));
            product.setExpiryDate(
                    rs.getDate("expiry_date").toLocalDate());

            return product;

        }, id);

        if (products.isEmpty()) {
            return null;
        }

        return products.get(0);
    }

    public Product saveProduct(Product product) {

        String sql = """
                INSERT INTO products
                (name, category, quantity, price, expiry_date)
                VALUES (?, ?, ?, ?, ?)
                """;

        KeyHolder keyHolder = new GeneratedKeyHolder();

        jdbcTemplate.update(connection -> {

            PreparedStatement statement = connection.prepareStatement(
                    sql,
                    Statement.RETURN_GENERATED_KEYS);

            statement.setString(1, product.getName());
            statement.setString(2, product.getCategory());
            statement.setInt(3, product.getQuantity());
            statement.setBigDecimal(4, product.getPrice());
            statement.setObject(5, product.getExpiryDate());

            return statement;

        }, keyHolder);

        product.setId(keyHolder.getKey().intValue());

        return product;
    }

    public Product updateProduct(Product product) {

        String sql = """
                UPDATE products
                SET name = ?, category = ?, quantity = ?, price = ?, expiry_date = ?
                WHERE id = ?
                """;

        jdbcTemplate.update(
                sql,
                product.getName(),
                product.getCategory(),
                product.getQuantity(),
                product.getPrice(),
                product.getExpiryDate(),
                product.getId());

        return product;
    }

    public void deleteProduct(int id) {

        String sql = "DELETE FROM products WHERE id = ?";

        jdbcTemplate.update(sql, id);
    }
}