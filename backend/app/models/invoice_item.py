from app import db


class InvoiceItem(db.Model):
    __tablename__ = "invoice_items"

    id = db.Column(
        db.Integer,
        primary_key=True
    )

    invoice_id = db.Column(
        db.Integer,
        db.ForeignKey("invoices.id", ondelete="CASCADE"),
        nullable=False
    )

    order_item_id = db.Column(
        db.Integer,
        db.ForeignKey("order_items.id"),
        nullable=True
    )

    product_id = db.Column(
        db.Integer,
        db.ForeignKey("products.id"),
        nullable=True
    )

    product_name = db.Column(
        db.String(255),
        nullable=False
    )

    quantity = db.Column(
        db.Integer,
        nullable=False,
        default=1
    )

    unit_price = db.Column(
        db.Numeric(10, 2),
        nullable=False,
        default=0
    )

    line_total = db.Column(
        db.Numeric(10, 2),
        nullable=False,
        default=0
    )

    taxable = db.Column(
        db.Boolean,
        nullable=False,
        default=True
    )

    tax_percentage = db.Column(
        db.Numeric(5, 2),
        nullable=False,
        default=9.00
    )

    tax_amount = db.Column(
        db.Numeric(10, 2),
        nullable=False,
        default=0
    )

    invoice = db.relationship(
        "Invoice",
        back_populates="items"
    )

    def to_dict(self):
        return {
            "id": self.id,
            "invoice_id": self.invoice_id,
            "order_item_id": self.order_item_id,
            "product_id": self.product_id,
            "product_name": self.product_name,
            "quantity": self.quantity,
            "unit_price": float(self.unit_price or 0),
            "line_total": float(self.line_total or 0),
            "taxable": self.taxable,
            "tax_percentage": float(self.tax_percentage or 0),
            "tax_amount": float(self.tax_amount or 0),
        }