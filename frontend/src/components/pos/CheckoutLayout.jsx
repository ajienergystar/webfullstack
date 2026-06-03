export default function CheckoutLayout({ productsPanel, checkoutPanel }) {
  return (
    <div className="pos-checkout-layout">
      {productsPanel}
      <section className="pos-checkout-panel ui-panel">
        <div className="ui-panel-body">
        {checkoutPanel}
        </div>
      </section>
    </div>
  )
}
