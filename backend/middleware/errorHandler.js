// const errorHandler = (err, req, res, next) => {
//   console.error(err);

//   res.status(500).json({
//     success: false,
//     error: "Something went wrong",
//   });
// };

// export default errorHandler;

const errorHandler = (err, req, res, next) => {
  console.error("ERROR:", err);

  res.status(500).json({
    success: false,
    error: err.message,
  });
};

export default errorHandler;
