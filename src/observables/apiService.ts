import { Observable, from } from "rxjs";
import { Order } from "../models/order";

const BASE_URL = "http://localhost:3000";

export function getRegistry(name: string): Observable<Order[]> {
  return from(
    fetch(`${BASE_URL}/orders/?name=${name}`)
      .then((res) => {
        if (res.ok) {
          console.log(res);
          return res.json();
        }
      })
      .catch((err) => console.log(err))
  );
}
