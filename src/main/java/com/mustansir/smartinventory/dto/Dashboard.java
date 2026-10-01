package com.mustansir.smartinventory.dto;

public class Dashboard {

    private int totalProducts;
    private int lowStockProducts;
    private int expiringSoonProducts;
    private double totalInventoryValue;

    public Dashboard() {
    }

    public Dashboard(
            int totalProducts,
            int lowStockProducts,
            int expiringSoonProducts,
            double totalInventoryValue) {

        this.totalProducts = totalProducts;
        this.lowStockProducts = lowStockProducts;
        this.expiringSoonProducts = expiringSoonProducts;
        this.totalInventoryValue = totalInventoryValue;
    }

    public int getTotalProducts() {
        return totalProducts;
    }

    public void setTotalProducts(int totalProducts) {
        this.totalProducts = totalProducts;
    }

    public int getLowStockProducts() {
        return lowStockProducts;
    }

    public void setLowStockProducts(int lowStockProducts) {
        this.lowStockProducts = lowStockProducts;
    }

    public int getExpiringSoonProducts() {
        return expiringSoonProducts;
    }

    public void setExpiringSoonProducts(int expiringSoonProducts) {
        this.expiringSoonProducts = expiringSoonProducts;
    }

    public double getTotalInventoryValue() {
        return totalInventoryValue;
    }

    public void setTotalInventoryValue(double totalInventoryValue) {
        this.totalInventoryValue = totalInventoryValue;
    }
}