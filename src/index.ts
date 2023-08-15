import { interval, fromEvent, Subscription } from "rxjs";
import { map, mergeMap, take, takeUntil } from "rxjs/operators";
import { Observable } from "rxjs";
import { Order } from "./models/order";

const orders: string[] = [
  "Leather strap",
  "Smartwatch",
  "Wireless headphones",
  "Fitness tracker",
  "Screen protector",
];

const statistics = {
  totalOrders: 0,
  totalDeliveryTime: 0,
  deliveredOrders: 0,
  productsCount: {} as Record<string, number>,
};

const generateRandomOrder = (): Order => {
  const randomIndex = Math.floor(Math.random() * orders.length);
  const content = orders[randomIndex];
  const address = "Address " + Math.floor(Math.random() * 100);

  const status = "In transit";

  const id = Math.floor(Math.random() * 1000);
  const deliveryTime = 0;

  return { id, address, status, content, deliveryTime };
};

const statusTransitions: Record<string, string[]> = {
  "In transit": ["Shipped"],
  Shipped: ["Delivered", "Cancelled"],
  Delivered: [],
  Cancelled: [],
};

const getRandomSeconds = () => Math.floor(Math.random() * 10) + 1;

const updateOrderStatus = (order: Order): Order => {
  const currentStatus = order.status;
  if (order.status === "Cancelled" || order.status === "Delivered") {
    return order;
  }
  const allowedTransitions = statusTransitions[currentStatus];
  if (!allowedTransitions || allowedTransitions.length === 0) {
    return order;
  }

  const randomNextStatus =
    allowedTransitions[Math.floor(Math.random() * allowedTransitions.length)];
  const secondsToWait = getRandomSeconds();

  setTimeout(() => {
    order.status = randomNextStatus;

    if (randomNextStatus === "Delivered") {
      order.deliveryTime += secondsToWait;
    }
  }, secondsToWait * 1000);

  return order;
};

const simulateDelivery = (order: Order) => {
  return interval(5000).pipe(
    map(() => updateOrderStatus(order)),
    takeUntil(fromEvent(document, "cancel"))
  );
};

const intervalTime = 5000;

const ordersList = document.getElementById("orders-list");

const ordersObservable = interval(intervalTime).pipe(
  map(() => generateRandomOrder()),
  take(10)
);

const updateStatistics = (order: Order) => {
  if (order.status === "Delivered") {
    statistics.deliveredOrders++;
    statistics.totalDeliveryTime += order.deliveryTime;
  }
  if (!statistics.productsCount[order.content]) {
    statistics.productsCount[order.content] = 0;
  }
  statistics.productsCount[order.content]++;
};

const updateStatisticsDisplay = () => {
  const totalOrdersElement = document.getElementById("total-orders");
  const averageDeliveryTimeElement = document.getElementById(
    "average-delivery-time"
  );
  const mostCommonProductElement = document.getElementById(
    "most-common-product"
  );

  totalOrdersElement.textContent = `Ukupan broj narudžbina: ${statistics.totalOrders}`;
  averageDeliveryTimeElement.textContent = `Prosečno vreme isporuke: ${
    statistics.totalDeliveryTime / statistics.deliveredOrders
  }h`;
  mostCommonProductElement.textContent = `Najčešći proizvod: ${getMostCommonProduct()}`;
};

// Funkcija za pronalaženje najčešćeg proizvoda
const getMostCommonProduct = () => {
  let mostCommonProduct = "";
  let maxCount = 0;

  for (const product in statistics.productsCount) {
    if (statistics.productsCount[product] > maxCount) {
      maxCount = statistics.productsCount[product];
      mostCommonProduct = product;
    }
  }

  return mostCommonProduct;
};

const orderSubscriptionsMap: { [id: number]: Subscription } = {};

ordersObservable.subscribe(
  (order) => {
    statistics.totalOrders++;
    const orderItem = document.createElement("li");

    const orderIdSpan = document.createElement("span");
    orderIdSpan.textContent = `ID: ${order.id}, `;
    orderItem.appendChild(orderIdSpan);

    const orderContentSpan = document.createElement("span");
    orderContentSpan.textContent = `Narudžbina: ${order.content}, `;
    orderItem.appendChild(orderContentSpan);

    const orderAddressSpan = document.createElement("span");
    orderAddressSpan.textContent = `Adresa: ${order.address}, `;
    orderItem.appendChild(orderAddressSpan);

    const orderStatusSpan = document.createElement("span");
    orderStatusSpan.textContent = `Status: ${order.status}`;
    orderItem.appendChild(orderStatusSpan);

    ordersList?.appendChild(orderItem);

    const cancelButton = document.createElement("button");
    cancelButton.textContent = "Otkaži isporuku";
    orderItem.appendChild(cancelButton);

    if (order.status !== "Delivered" && order.status !== "Cancelled") {
      const updatedOrderObservable = simulateDelivery(order);

      const orderSubscription = updatedOrderObservable.subscribe(
        (updatedOrder) => {
          orderStatusSpan.textContent = `Status: ${updatedOrder.status}`;
          updateStatistics(updatedOrder);
          updateStatisticsDisplay();

          if (
            updatedOrder.status === "Cancelled" ||
            updatedOrder.status === "Delivered"
          ) {
            cancelButton.remove();
          }
        }
      );

      orderSubscriptionsMap[order.id] = orderSubscription;

      cancelButton.setAttribute("data-order-id", order.id.toString());
      const cancelObservable = fromEvent(cancelButton, "click");

      cancelObservable.subscribe(() => {
        const orderId = parseInt(cancelButton.getAttribute("data-order-id")!);
        const subscription = orderSubscriptionsMap[orderId];
        if (subscription) {
          subscription.unsubscribe();
          order.status = "Cancelled";
          orderStatusSpan.textContent = `Status: ${order.status}`;
          cancelButton.remove();
        }
      });
    }
  },
  undefined,
  () => {
    updateStatisticsDisplay();
  }
);
