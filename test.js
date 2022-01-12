const startDate = new Date();
const endDate = new Date();
startDate.setMonth(startDate.getMonth() - 1);
startDate.setDate(1);

endDate.setDate(1);

console.log(new Date(startDate), endDate);
