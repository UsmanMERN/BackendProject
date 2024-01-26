// Dummy data for users collection
const usersData = [
    { _id: 1, name: 'Alice', age: 25, country: 'USA' },
    { _id: 2, name: 'Bob', age: 30, country: 'Canada' },
    { _id: 3, name: 'Charlie', age: 22, country: 'UK' },
    { _id: 4, name: 'David', age: 35, country: 'USA' },
    { _id: 5, name: 'Eva', age: 28, country: 'Canada' },
];

// Dummy data for orders collection
const ordersData = [
    { _id: 101, userId: 1, totalAmount: 50, status: 'completed' },
    { _id: 102, userId: 2, totalAmount: 75, status: 'pending' },
    { _id: 103, userId: 1, totalAmount: 30, status: 'completed' },
    { _id: 104, userId: 3, totalAmount: 40, status: 'completed' },
    { _id: 105, userId: 2, totalAmount: 60, status: 'pending' },
    { _id: 106, userId: 4, totalAmount: 90, status: 'completed' },
    { _id: 107, userId: 5, totalAmount: 55, status: 'pending' },
];

export { usersData, ordersData };
