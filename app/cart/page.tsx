import Link from "next/link";

export default function Cart(){
  return <article className="page cartPage">
    <p className="kicker">Cart</p>
    <h1 className="pageTitle">Your cart.</h1>
    <p className="pageIntro">Your cart is empty. Search for a domain to start a registration, or transfer a domain you already own.</p>
    <div className="cartActions">
      <Link className="primaryLink" href="/">Search domains</Link>
      <Link className="secondaryLink" href="/transfer">Transfer a domain</Link>
    </div>
  </article>;
}
