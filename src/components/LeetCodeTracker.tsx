"use client";

import React, { useEffect, useMemo, useState } from "react";
import {
  Star,
  ChevronUp,
  ChevronDown,
  ChevronsUpDown,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";

/* ================================
   CONFIG
================================ */
const DATA_URL =
  "https://zerotrac.github.io/leetcode_problem_rating/data.json";

const STORAGE_KEY = "leetcode-tracker-v2";
const DATA_VERSION = 1;

/* ================================
   TYPES
================================ */
type Problem = {
  id: string;
  title: string;
  slug: string;
  rating: number;
  contest: string;
  difficulty: string;
  solved: boolean;
  starred: boolean;
  notes: string;
  tc: string;
  sc: string;
};

type RawItem = {
  ID: number;
  Title: string;
  TitleSlug: string;
  Rating?: number;
  ContestID_en?: string;
  ProblemIndex?: string;
};

/* ================================
   MAIN COMPONENT
================================ */
export default function LeetCodeTracker() {
  const [allProblems, setAllProblems] = useState<Problem[]>([]);
  const [visible, setVisible] = useState<Problem[]>([]);

  const [loading, setLoading] = useState(true);

  const [filters, setFilters] = useState({
    min: 0,
    max: 3500,
    query: "",
    solved: false,
    starred: false,
  });

  const [sort, setSort] = useState<{ key: keyof Problem | null; dir: "asc" | "desc" }>({
    key: null,
    dir: "asc",
  });

  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);

  /* ================================
     INIT
  ================================ */
  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    try {
      const cache = localStorage.getItem(STORAGE_KEY);

      if (cache) {
        const parsed = JSON.parse(cache);

        if (parsed.version === DATA_VERSION) {
          setAllProblems(parsed.data);
          setLoading(false);
          return;
        }
      }

      await fetchAndMerge();
    } catch {
      await fetchAndMerge();
    }
  }

  async function fetchAndMerge() {
    const res = await fetch(DATA_URL);
    const raw: RawItem[] = await res.json();

    const saved: Problem[] =
      JSON.parse(localStorage.getItem(STORAGE_KEY) || "{}")?.data || [];

    const savedMap = new Map(saved.map((p) => [p.id, p]));

    const merged: Problem[] = raw.map((r) => {
      const old = savedMap.get(String(r.ID));

      return {
        id: String(r.ID),
        title: r.Title,
        slug: r.TitleSlug,
        rating: Math.round(r.Rating || 0),
        contest: r.ContestID_en || "",

        difficulty: inferDifficulty(r.ProblemIndex),

        solved: old?.solved || false,
        starred: old?.starred || false,
        notes: old?.notes || "",
        tc: old?.tc || "",
        sc: old?.sc || "",
      };
    });

    persist(merged);

    setAllProblems(merged);
    setLoading(false);
  }

  function persist(data: Problem[]) {
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({
        version: DATA_VERSION,
        data,
      })
    );
  }

  /* ================================
     FILTER + SORT
  ================================ */
  useEffect(() => {
    let list = [...allProblems];

    list = list.filter(
      (p) =>
        p.rating >= filters.min &&
        p.rating <= filters.max
    );

    if (filters.solved)
      list = list.filter((p) => p.solved);

    if (filters.starred)
      list = list.filter((p) => p.starred);

    if (filters.query) {
      const q = filters.query.toLowerCase();

      list = list.filter(
        (p) =>
          p.title.toLowerCase().includes(q) ||
          p.id.includes(q)
      );
    }

    if (sort.key) {
      list.sort((a, b) => {
        let A: number | string | boolean = a[sort.key!];
        let B: number | string | boolean = b[sort.key!];

        if (sort.key === "difficulty") {
          const map: Record<string, number> = { Easy: 1, Medium: 2, Hard: 3 };
          A = map[String(A)] ?? 0;
          B = map[String(B)] ?? 0;
        }

        if (A < B) return sort.dir === "asc" ? -1 : 1;
        if (A > B) return sort.dir === "asc" ? 1 : -1;

        return 0;
      });
    }

    setVisible(list);
    setPage(1);
  }, [filters, allProblems, sort]);

  /* ================================
     MUTATIONS
  ================================ */
  function update(id: string, patch: Partial<Problem>) {
    const next = allProblems.map((p) =>
      p.id === id ? { ...p, ...patch } : p
    );

    setAllProblems(next);
    persist(next);
  }

  /* ================================
     PAGINATION
  ================================ */
  const pages = Math.ceil(visible.length / pageSize);

  const slice = useMemo(() => {
    const s = (page - 1) * pageSize;
    return visible.slice(s, s + pageSize);
  }, [visible, page, pageSize]);

  /* ================================
     STATS
  ================================ */
  const stats = useMemo(() => {
    const solved = allProblems.filter((p) => p.solved).length;

    return {
      total: allProblems.length,
      solved,
      starred: allProblems.filter((p) => p.starred).length,
      percent:
        allProblems.length === 0
          ? "0"
          : ((solved / allProblems.length) * 100).toFixed(1),
    };
  }, [allProblems]);

  /* ================================
     UI
  ================================ */
  if (loading) {
    return (
      <div className="h-screen flex items-center justify-center text-xl text-gray-800">
        Loading full dataset...
      </div>
    );
  }

  return (
    <div className="p-6 bg-gray-50 min-h-screen text-gray-900">

      {/* HEADER */}
      <Header stats={stats} />

      {/* FILTERS */}
      <Filters filters={filters} setFilters={setFilters} pageSize={pageSize} setPageSize={setPageSize} />

      {/* TABLE */}
      <Table
        data={slice}
        sort={sort}
        setSort={setSort}
        update={update}
      />

      {/* PAGINATION */}
      <Pager page={page} pages={pages} setPage={setPage} />

    </div>
  );
}

/* ================================
   HELPERS
================================ */
function inferDifficulty(idx?: string): string {
  if (idx === "Q1") return "Easy";
  if (["Q3", "Q4", "Q5"].includes(idx || "")) return "Hard";
  return "Medium";
}

/* ================================
   COMPONENTS
================================ */

function Header({ stats }: { stats: { total: number; solved: number; starred: number; percent: string } }) {
  return (
    <div className="mb-6">
      <h1 className="text-3xl font-bold text-gray-900">
        LeetCode Tracker
      </h1>

      <div className="flex gap-6 mt-2 text-sm text-gray-700">
        <span>Total: {stats.total}</span>
        <span className="text-green-600">
          Solved: {stats.solved}
        </span>
        <span className="text-yellow-600">
          Starred: {stats.starred}
        </span>
        <span>Progress: {stats.percent}%</span>
      </div>
    </div>
  );
}

function Filters({
  filters,
  setFilters,
  pageSize,
  setPageSize,
}: {
  filters: { min: number; max: number; query: string; solved: boolean; starred: boolean };
  setFilters: React.Dispatch<React.SetStateAction<typeof filters>>;
  pageSize: number;
  setPageSize: React.Dispatch<React.SetStateAction<number>>;
}) {
  return (
    <div className="bg-white p-4 rounded shadow mb-4 grid md:grid-cols-4 gap-3">

      <input
        type="number"
        placeholder="Min rating"
        value={filters.min}
        onChange={(e) =>
          setFilters({ ...filters, min: +e.target.value })
        }
        className="border border-gray-300 p-2 rounded text-gray-900 placeholder:text-gray-500 bg-white"
      />

      <input
        type="number"
        placeholder="Max rating"
        value={filters.max}
        onChange={(e) =>
          setFilters({ ...filters, max: +e.target.value })
        }
        className="border border-gray-300 p-2 rounded text-gray-900 placeholder:text-gray-500 bg-white"
      />

      <input
        placeholder="Search..."
        value={filters.query}
        onChange={(e) =>
          setFilters({ ...filters, query: e.target.value })
        }
        className="border border-gray-300 p-2 rounded text-gray-900 placeholder:text-gray-500 bg-white"
      />

      <div className="flex gap-3 items-center">

        <label className="flex gap-1 text-sm text-gray-800">
          <input
            type="checkbox"
            checked={filters.solved}
            onChange={(e) =>
              setFilters({
                ...filters,
                solved: e.target.checked,
              })
            }
          />
          Solved
        </label>

        <label className="flex gap-1 text-sm text-gray-800">
          <input
            type="checkbox"
            checked={filters.starred}
            onChange={(e) =>
              setFilters({
                ...filters,
                starred: e.target.checked,
              })
            }
          />
          Starred
        </label>

        <select
          value={pageSize}
          onChange={(e) => setPageSize(+e.target.value)}
          className="border border-gray-300 p-1 rounded text-sm text-gray-900 bg-white"
        >
          <option>25</option>
          <option>50</option>
          <option>100</option>
        </select>

      </div>
    </div>
  );
}

function Table({
  data,
  sort,
  setSort,
  update,
}: {
  data: Problem[];
  sort: { key: keyof Problem | null; dir: "asc" | "desc" };
  setSort: React.Dispatch<React.SetStateAction<typeof sort>>;
  update: (id: string, patch: Partial<Problem>) => void;
}) {
  function toggle(key: keyof Problem) {
    setSort((p) => ({
      key,
      dir:
        p.key === key && p.dir === "asc"
          ? "desc"
          : "asc",
    }));
  }

  function icon(key: keyof Problem) {
    if (sort.key !== key)
      return <ChevronsUpDown size={14} />;

    return sort.dir === "asc" ? (
      <ChevronUp size={14} />
    ) : (
      <ChevronDown size={14} />
    );
  }

  return (
    <div className="bg-white rounded shadow overflow-x-auto">

      <table className="w-full text-sm text-gray-900">

        <thead className="bg-gray-100">
          <tr>

            <Th>✓</Th>
            <Th>★</Th>

            <Th onClick={() => toggle("id")}>
              ID {icon("id")}
            </Th>

            <Th>Title</Th>

            <Th onClick={() => toggle("difficulty")}>
              Difficulty {icon("difficulty")}
            </Th>

            <Th onClick={() => toggle("rating")}>
              Rating {icon("rating")}
            </Th>

            <Th>TC</Th>
            <Th>SC</Th>
            <Th>Notes</Th>

          </tr>
        </thead>

        <tbody>
          {data.map((p) => (
            <tr
              key={p.id}
              className={p.solved ? "bg-green-50" : ""}
            >
              <Td>
                <input
                  type="checkbox"
                  checked={p.solved}
                  onChange={() =>
                    update(p.id, { solved: !p.solved })
                  }
                />
              </Td>

              <Td>
                <Star
                  size={16}
                  onClick={() =>
                    update(p.id, { starred: !p.starred })
                  }
                  className={`cursor-pointer ${
                    p.starred
                      ? "fill-yellow-500 text-yellow-500"
                      : "text-gray-400"
                  }`}
                />
              </Td>

              <Td>{p.id}</Td>

              <Td>
                <a
                  href={`https://leetcode.com/problems/${p.slug}/`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-blue-600"
                >
                  {p.title}
                </a>
              </Td>

              <Td>
                <span
                  className={
                    p.difficulty === "Easy"
                      ? "text-green-700 font-medium"
                      : p.difficulty === "Medium"
                        ? "text-orange-600 font-medium"
                        : "text-red-700 font-medium"
                  }
                >
                  {p.difficulty}
                </span>
              </Td>

              <Td>{p.rating}</Td>

              <Td>
                <input
                  value={p.tc}
                  onChange={(e) =>
                    update(p.id, { tc: e.target.value })
                  }
                  className="border border-gray-300 p-1 w-20 text-gray-900 placeholder:text-gray-500 bg-white"
                />
              </Td>

              <Td>
                <input
                  value={p.sc}
                  onChange={(e) =>
                    update(p.id, { sc: e.target.value })
                  }
                  className="border border-gray-300 p-1 w-20 text-gray-900 placeholder:text-gray-500 bg-white"
                />
              </Td>

              <Td>
                <input
                  value={p.notes}
                  onChange={(e) =>
                    update(p.id, { notes: e.target.value })
                  }
                  className="border border-gray-300 p-1 w-48 text-gray-900 placeholder:text-gray-500 bg-white"
                />
              </Td>

            </tr>
          ))}
        </tbody>

      </table>
    </div>
  );
}

function Pager({ page, pages, setPage }: { page: number; pages: number; setPage: React.Dispatch<React.SetStateAction<number>> }) {
  if (pages <= 1) return null;

  return (
    <div className="mt-4 flex justify-between items-center text-gray-800">

      <span className="text-sm">
        Page {page} / {pages}
      </span>

      <div className="flex gap-2">

        <button
          disabled={page === 1}
          onClick={() => setPage(1)}
          className="px-2 py-1 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
        >
          First
        </button>

        <button
          disabled={page === 1}
          onClick={() => setPage(page - 1)}
          className="p-1 text-gray-700 border border-gray-300 rounded disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
        >
          <ChevronLeft size={16} />
        </button>

        <button
          disabled={page === pages}
          onClick={() => setPage(page + 1)}
          className="p-1 text-gray-700 border border-gray-300 rounded disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
        >
          <ChevronRight size={16} />
        </button>

        <button
          disabled={page === pages}
          onClick={() => setPage(pages)}
          className="px-2 py-1 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
        >
          Last
        </button>

      </div>
    </div>
  );
}

function Th({ children, onClick }: { children: React.ReactNode; onClick?: () => void }) {
  return (
    <th
      onClick={onClick}
      className="p-2 text-left cursor-pointer text-gray-900 font-semibold"
    >
      {children}
    </th>
  );
}

function Td({ children }: { children: React.ReactNode }) {
  return <td className="p-2 text-gray-900">{children}</td>;
}
