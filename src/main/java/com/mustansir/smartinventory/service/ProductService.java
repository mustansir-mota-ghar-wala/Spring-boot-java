package com.mustansir.smartinventory.service;

import com.mustansir.smartinventory.dto.Dashboard;
import com.mustansir.smartinventory.model.Product;
import com.mustansir.smartinventory.repository.ProductRepository;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;

import java.util.List;

@Service
public class ProductService {

    private final ProductRepository productRepository;

    public ProductService(ProductRepository productRepository) {
        this.productRepository = productRepository;
    }

    public List<Product> getAllProducts() {
        return productRepository.findAll();
    }

    public List<Product> getLowStockProducts() {
        return productRepository.findLowStockProducts();
    }

    public List<Product> getExpiringSoonProducts() {
        return productRepository.findExpiringSoonProducts();
    }

    public List<Product> searchProductsByName(String name) {
        return productRepository.searchProductsByName(name);
    }

    public Dashboard getDashboard() {

        int totalProducts = productRepository.countProducts();

        int lowStockProducts = productRepository.countLowStockProducts();

        int expiringSoonProducts = productRepository.countExpiringSoonProducts();

        double totalInventoryValue = productRepository.calculateInventoryValue();

        return new Dashboard(
                totalProducts,
                lowStockProducts,
                expiringSoonProducts,
                totalInventoryValue);
    }

    public Product getProductById(int id) {

        Product product = productRepository.findById(id);

        if (product == null) {
            throw new ResponseStatusException(
                    HttpStatus.NOT_FOUND,
                    "Product not found");
        }

        return product;
    }

    public Product saveProduct(Product product) {
        return productRepository.saveProduct(product);
    }

    public Product updateProduct(Product product) {
        return productRepository.updateProduct(product);
    }

    public void deleteProduct(int id) {
        productRepository.deleteProduct(id);
    }
}