
import assert from "node:assert/strict";
import { beforeEach, describe, test } from "node:test";
import { TranscriptStore } from "../src/transcriptStore.js";
import { createAppServer } from "../src/server.js";

describe("TranscriptStore", () => {
  let store;

  beforeEach(() => {
    store = new TranscriptStore();
  });

  test("adds students and returns their transcripts", () => {
    const studentID = store.addStudent("Ada");

    assert.equal(studentID, 1);
    assert.deepEqual(store.getTranscript(studentID), {
      student: { studentID, studentName: "Ada" },
      grades: [],
    });
  });

  test("adds and changes a course grade", () => {
    const studentID = store.addStudent("Lin");

    assert.deepEqual(store.addGrade(studentID, "cs360", "85"), {
      studentID,
      course: "CS360",
      grade: 85,
    });
    assert.deepEqual(store.changeGrade(studentID, "CS360", 92), {
      studentID,
      course: "CS360",
      grade: 92,
    });
  });

  test("rejects invalid student, course, and grade inputs", () => {
    const studentID = store.addStudent("Noah");

    assert.throws(() => store.addStudent("   "), /Student name is required/);
    assert.throws(() => store.addGrade(studentID, "", 90), /Course name is required/);
    assert.throws(
      () => store.addGrade(studentID, "CS360", 101),
      /Grade must be an integer from 0 to 100/,
    );
  });

  test("supports exact-name lookup and deletion", () => {
    const firstID = store.addStudent("Grace Lee");
    const secondID = store.addStudent("Grace Hall");

    assert.deepEqual(store.getStudentIDs("Grace Lee"), [firstID]);
    store.deleteStudent(secondID);
    assert.deepEqual(store.getStudentIDs(), [firstID]);
    assert.throws(() => store.deleteStudent(secondID), /Student not found/);
  });

  test("removes grades when a student is deleted", () => {
    const studentID = store.addStudent("Ada");

    store.addGrade(studentID, "CS360", 85);
    store.deleteStudent(studentID);

    assert.equal(store.getGrade(studentID, "CS360"), undefined);
  });

  test("returns 404 for a deleted student's grade", async () => {
    const studentID = store.addStudent("Ada");
    store.addGrade(studentID, "CS360", 85);

    const server = createAppServer(store);

    await new Promise(resolve => {
      server.listen(0, "127.0.0.1", resolve);
    });

    try {
      const url = `http://127.0.0.1:${server.address().port}/transcripts/${studentID}`;

      const deleted = await fetch(url, {
        method: "DELETE"
      });

      assert.equal(deleted.status, 204);

      const response = await fetch(`${url}/CS360`);

      assert.equal(response.status, 404);
    } finally {
      await new Promise(resolve => server.close(resolve));
    }
  });
    test("rejects duplicate course grades", () => {
    const studentID = store.addStudent("Lin");

    store.addGrade(studentID, "CS360", 85);

    assert.throws(
      () => store.addGrade(studentID, " cs360 ", 90),
      {
        message: "Grade already exists for course CS360"
      }
    );

    assert.equal(store.getGrade(studentID, "CS360"), 85);

    store.changeGrade(studentID, "CS360", 90);

    assert.equal(store.getGrade(studentID, "CS360"), 90);
  });
});
