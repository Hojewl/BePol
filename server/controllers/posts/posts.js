import * as postRepository from "../../services/post.js";
import { downloadS3File } from "../functions/file.js";
import { verifyToken } from "../functions/authentication.js";

export const getPostsList = async (req, res, next) => {
  /**
   * 기능: 법안 발의문 리스트 조회
   * 작성자: 이승연
   * 📌 쿼리별 게시글 리스트 조회 기능
   * 💡 query
   * 📍 category - 법률 카테고리 별 검색 ✔︎
   * 📍 sortby - 최신순, 마감임박순, 찬성순, 반대순 ✔︎
   * 📍 search - 검색 ✔︎
   * 📍 closed - 마감여부 ✔︎
   * 📍 page - 페이지당 게시물 개수 ✔︎
   * 📍 최적화 🔺 - 페이징 최적화 ❌
   */
  const { category, sortby, search, closed, page } = req.query;
  let data;
  try {
    // 카테고리 제외
    if (closed === "true") {
      // 마감 완료
      data = await postRepository.getClosedSearchedTitleBySorting(
        search,
        sortby,
        page
      );
    } else if (closed === "false") {
      // 마감 x
      data = await postRepository.getSearchedTitleBySorting(
        search,
        sortby,
        page
      );
    }

    // 카테고리 검색일 경우
    if (category) {
      const categoryArr = category.split(",");
      let filteredData;
      if (closed === "true") {
        data = await postRepository.getClosedAllByCategory(
          categoryArr,
          search,
          sortby,
          page
        );
        filteredData = data.filter((post) => post !== false);
      } else if (closed === "false") {
        data = await postRepository.getAllByCategory(
          categoryArr,
          search,
          sortby,
          page
        );
        filteredData = data.filter((post) => post !== false);
      }
      return res.status(200).json({
        data: filteredData[0],
      });
    }

    return res.status(200).json({
      data,
    });
  } catch (err) {
    return res.status(500).json({
      message: "Server Error!",
    });
  }
};

export const createPost = async (req, res) => {
  /**
   * 기능: 게시글 생성
   * 작성자: 나수민
   * 📌 첨부파일 업로드 미들웨어 거친 후 파일 경로를 저장해 도큐먼트 생성
   */

  try {
    const user = { id: "62eb19eec68ed76ba371a228", username: "bepol" }; //테스트 데이터
    //verifyToken(req.headers["access-token"].split(" ")[1]);
    const { title, purport, contents, category } = req.body;

    const createdPost = await postRepository.createPost(
      user.id,
      user.username,
      title,
      category,
      purport,
      contents,
      req.files
    );

    res.json(createdPost);
  } catch (err) {
    res.status(500).json(err);
  }
};

export const deletePost = async (req, res) => {
  /**
   * 기능: 게시글 삭제
   * 작성자: 나수민
   * 📌 게시물과 함께 s3 버킷에 저장된 파일도 삭제
   */
  try {
    const user = { id: "62eb19eec68ed76ba371a228", username: "bepol" }; //테스트 데이터
    //verifyToken(req.headers["access-token"].split(" ")[1]);
    const deletedPost = await postRepository.deletePost(
      user.id,
      req.params.postId
    );

    if (deletedPost) {
      res.sendStatus(204);
    } else {
      res.sendStatus(500);
    }
  } catch (err) {}
};

export const getPost = async (req, res) => {
  /**
   * 기능: 게시글 상세조회
   * 작성자: 나수민
   * 📌 게시글 내에서 첨부파일 다운로드 기능 -> 새 엔드포인트 추가✔
   */
  try {
    const post = await postRepository.getPost(req.params.postId);
    const { __v, updatedAt, userId, comments, ...postInfo } = post.toObject();
    if (req.headers["access-token"]) {
      const user = verifyToken(req.headers["access-token"].split(" ")[1]);
      const answer = await postRepository.getPostAnswer(
        user.id,
        req.params.postId
      );
      if (answer !== undefined) {
        postInfo.answer = answer;
      }
    }
    res.json(postInfo);
  } catch (err) {
    res.status(500).json(err);
  }
};

export const downloadFile = async (req, res) => {
  try {
    const fileName = await postRepository.getFileName(
      req.params.postId,
      Number(req.query.fileIndex)
    );
    if (fileName) {
      const fileStream = downloadS3File(res, fileName);
      fileStream.pipe(res);
      res.status(200).json({ message: "File downloaded successfully" });
    } else res.sendStatus(500);
  } catch (err) {
    console.log(err);
    res.status(500).json(err);
  }
};
